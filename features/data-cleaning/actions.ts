"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { requireProjectRole } from "@/lib/authorization";
import { logActivity } from "@/lib/activity";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import { ask, buildCleaningPrompt } from "@/lib/gemini";
import { z } from "zod";

const cleanSchema = z.object({
  datasetId: z.string().min(1),
  operation: z.enum([
    "remove_duplicates",
    "fill_missing_mean",
    "fill_missing_median",
    "fill_missing_mode",
    "normalize_text",
    "trim_whitespace",
    "ai_suggestions",
  ]),
  column: z.string().optional(),
});

type CleaningResult = {
  rowsAffected: number;
  description: string;
  suggestions?: string;
};

export async function runCleaningOperation(
  input: unknown
): Promise<ActionResult<CleaningResult>> {
  try {
    const user = await requireUser();
    assertRateLimited(`clean:${user.id}`, { limit: 30, windowMs: 60_000 });

    const { datasetId, operation, column } = cleanSchema.parse(input);

    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { projectId: true, name: true, previewJson: true, schemaJson: true, rowCount: true },
    });
    if (!dataset) throw new Error("Dataset not found");

    await requireProjectRole(user, dataset.projectId, "EDITOR");

    const rows = (dataset.previewJson as Record<string, unknown>[]) ?? [];
    let newRows = [...rows];
    let rowsAffected = 0;
    let description = "";

    switch (operation) {
      case "remove_duplicates": {
        const seen = new Set<string>();
        newRows = rows.filter((row) => {
          const key = JSON.stringify(row);
          if (seen.has(key)) { rowsAffected++; return false; }
          seen.add(key);
          return true;
        });
        description = `Removed ${rowsAffected} duplicate rows`;
        break;
      }

      case "trim_whitespace": {
        newRows = rows.map((row) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            cleaned[k] = typeof v === "string" ? v.trim() : v;
            if (cleaned[k] !== v) rowsAffected++;
          }
          return cleaned;
        });
        description = `Trimmed whitespace in ${rowsAffected} cells`;
        break;
      }

      case "normalize_text": {
        const target = column;
        newRows = rows.map((row) => {
          if (!target || !(target in row)) return row;
          const orig = String(row[target] ?? "");
          const norm = orig.toLowerCase().trim().replace(/\s+/g, " ");
          if (norm !== orig) rowsAffected++;
          return { ...row, [target]: norm };
        });
        description = `Normalized text in "${target}": ${rowsAffected} cells changed`;
        break;
      }

      case "fill_missing_mean":
      case "fill_missing_median":
      case "fill_missing_mode": {
        const target = column;
        if (!target) throw new Error("Column required for fill missing");

        const numValues = rows
          .map((r) => Number(r[target]))
          .filter((v) => !isNaN(v) && isFinite(v))
          .sort((a, b) => a - b);

        let fillValue: number;
        if (operation === "fill_missing_mean") {
          fillValue = numValues.reduce((s, v) => s + v, 0) / numValues.length;
        } else if (operation === "fill_missing_median") {
          const mid = Math.floor(numValues.length / 2);
          fillValue = numValues.length % 2 === 0 ? (numValues[mid - 1] + numValues[mid]) / 2 : numValues[mid];
        } else {
          const freq = new Map<number, number>();
          for (const v of numValues) freq.set(v, (freq.get(v) ?? 0) + 1);
          fillValue = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
        }

        newRows = rows.map((row) => {
          const v = row[target];
          if (v === null || v === "" || v === undefined) {
            rowsAffected++;
            return { ...row, [target]: Math.round(fillValue * 100) / 100 };
          }
          return row;
        });
        description = `Filled ${rowsAffected} missing values in "${target}" with ${operation.replace("fill_missing_", "")} (${fillValue.toFixed(2)})`;
        break;
      }

      case "ai_suggestions": {
        const schema = (dataset.schemaJson as { name: string; inferredType: string; missingCount: number; uniqueCount: number }[]) ?? [];
        const prompt = buildCleaningPrompt({ datasetName: dataset.name, schema, previewRows: rows });
        const suggestions = await ask(prompt, undefined, undefined, 2048);
        return {
          success: true,
          data: { rowsAffected: 0, description: "AI cleaning suggestions generated", suggestions },
        };
      }
    }

    // Persist cleaned preview
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        previewJson: newRows as Prisma.InputJsonValue,
        rowCount: operation === "remove_duplicates" ? dataset.rowCount - rowsAffected : dataset.rowCount,
      },
    });

    // Create a new version record
    const latest = await prisma.datasetVersion.findFirst({
      where: { datasetId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    await prisma.datasetVersion.create({
      data: {
        datasetId,
        version: (latest?.version ?? 0) + 1,
        label: description,
        rowCount: newRows.length,
      },
    });

    await logActivity({
      actorId: user.id,
      action: "DATASET_CLEANED",
      projectId: dataset.projectId,
      metadata: { entityName: dataset.name, operation, rowsAffected },
    });

    revalidatePath(`/dashboard/datasets/${datasetId}`);
    return { success: true, data: { rowsAffected, description } };
  } catch (error) {
    return actionError(error);
  }
}
