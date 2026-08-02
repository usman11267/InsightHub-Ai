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

import { buildSchema } from "@/features/datasets/schemas";

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

export type CleaningSuggestion = {
  operation: string;
  column: string | null;
  reason: string;
  priority: "high" | "medium" | "low";
  estimatedImpact?: string;
};

/**
 * The model is told to return only a JSON array, but models wrap output in
 * markdown fences or prose anyway. Extract the array and validate each item,
 * dropping anything that doesn't look like a suggestion.
 */
function parseCleaningSuggestions(raw: string): CleaningSuggestion[] {
  const withoutFences = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = withoutFences.indexOf("[");
  const end = withoutFences.lastIndexOf("]");
  if (start === -1 || end <= start) return [];

  let arr: unknown;
  try {
    arr = JSON.parse(withoutFences.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  return arr.flatMap((item): CleaningSuggestion[] => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    if (typeof o.operation !== "string" || typeof o.reason !== "string") return [];
    const priority =
      o.priority === "high" || o.priority === "medium" || o.priority === "low"
        ? o.priority
        : "low";
    return [
      {
        operation: o.operation,
        column: typeof o.column === "string" ? o.column : null,
        reason: o.reason,
        priority,
        ...(typeof o.estimatedImpact === "string"
          ? { estimatedImpact: o.estimatedImpact }
          : {}),
      },
    ];
  });
}

type CleaningResult = {
  rowsAffected: number;
  description: string;
  suggestions?: CleaningSuggestion[];
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
        description = rowsAffected > 0
          ? `Removed ${rowsAffected} duplicate row${rowsAffected === 1 ? "" : "s"}`
          : "No duplicate rows found — dataset is already clean";
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
        description = rowsAffected > 0
          ? `Trimmed whitespace in ${rowsAffected} cell${rowsAffected === 1 ? "" : "s"}`
          : "No text cells needed whitespace trimming";
        break;
      }

      case "normalize_text": {
        newRows = rows.map((row) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (typeof v === "string") {
              const norm = v.toLowerCase().trim().replace(/\s+/g, " ");
              if (norm !== v) rowsAffected++;
              cleaned[k] = norm;
            } else {
              cleaned[k] = v;
            }
          }
          return cleaned;
        });
        description = rowsAffected > 0
          ? `Normalized text casing in ${rowsAffected} cell${rowsAffected === 1 ? "" : "s"}`
          : "No text cells needed casing normalization";
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
        if (numValues.length === 0) {
          fillValue = 0;
        } else if (operation === "fill_missing_mean") {
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
        description = rowsAffected > 0
          ? `Filled ${rowsAffected} missing value${rowsAffected === 1 ? "" : "s"} in "${target}" with ${operation.replace("fill_missing_", "")} (${fillValue.toFixed(2)})`
          : `No missing values found in "${target}"`;
        break;
      }

      case "ai_suggestions": {
        const schema = (dataset.schemaJson as { name: string; inferredType: string; missingCount: number; uniqueCount: number }[]) ?? [];
        const prompt = buildCleaningPrompt({ datasetName: dataset.name, schema, previewRows: rows });
        const raw = await ask(prompt, undefined, undefined, 2048);
        const suggestions = parseCleaningSuggestions(raw);
        return {
          success: true,
          data: {
            rowsAffected: 0,
            description: `AI cleaning suggestions generated (${suggestions.length})`,
            suggestions,
          },
        };
      }
    }

    const newSchema = buildSchema(newRows);

    // Persist cleaned data and updated column schema.
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        previewJson: newRows as Prisma.InputJsonValue,
        schemaJson: newSchema as unknown as Prisma.InputJsonValue,
        rowCount: newRows.length,
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
