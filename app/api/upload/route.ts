import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHash } from "crypto";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/auth";
import { requireProjectRole } from "@/lib/authorization";
import { uploadToStorage } from "@/lib/supabase";
import { sniffFileType, sanitiseFilename } from "@/lib/file-validation";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_UPLOAD_BYTES,
  MAX_PARSED_ROWS,
  MAX_PARSED_COLUMNS,
  fileTypeFromExtension,
} from "@/features/datasets/schemas";
import { findDuplicateByChecksum } from "@/features/datasets/queries";

// Types for parsed data
type ParsedRow = Record<string, string | number | boolean | null>;

type ColumnSchema = {
  name: string;
  inferredType: "string" | "number" | "boolean" | "date" | "mixed";
  missingCount: number;
  uniqueCount: number;
};

/**
 * Progress events streamed back to the client as NDJSON (one JSON object per
 * line). The client renders each event as it arrives, so the user sees the
 * workbook being read and every sheet imported in real time instead of one
 * opaque spinner.
 */
type ProgressEvent =
  | { type: "reading" }
  | { type: "sheets"; sheets: string[] }
  | { type: "sheet"; name: string }
  | { type: "sheet-done"; name: string; id: string; rows: number; columns: number }
  | { type: "sheet-skipped"; name: string; reason: string }
  | { type: "done"; datasets: CreatedDataset[]; created: number; skipped: string[] }
  | { type: "error"; message: string };

type CreatedDataset = {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  sheetName: string | null;
};

/** Infer the type of a column from its values. */
function inferColumnType(values: (string | number | boolean | null)[]): ColumnSchema["inferredType"] {
  const nonNull = values.filter((v) => v !== null && v !== "");
  if (nonNull.length === 0) return "string";

  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  for (const v of nonNull) {
    const s = String(v).trim();
    if (!isNaN(Number(s)) && s !== "") numCount++;
    else if (["true", "false", "yes", "no", "1", "0"].includes(s.toLowerCase())) boolCount++;
    else if (!isNaN(Date.parse(s)) && s.length >= 8) dateCount++;
  }

  const ratio = (count: number) => count / nonNull.length;
  if (ratio(numCount) > 0.85) return "number";
  if (ratio(boolCount) > 0.85) return "boolean";
  if (ratio(dateCount) > 0.85) return "date";
  return "string";
}

/** Build column schema from parsed rows. */
function buildSchema(rows: ParsedRow[]): ColumnSchema[] {
  if (rows.length === 0) return [];
  const columns = Object.keys(rows[0]);

  return columns.map((name) => {
    const values = rows.map((r) => r[name] ?? null);
    const nonNull = values.filter((v) => v !== null && v !== "").length;
    const unique = new Set(values.map(String)).size;

    return {
      name,
      inferredType: inferColumnType(values),
      missingCount: values.length - nonNull,
      uniqueCount: unique,
    };
  });
}

/** Parse CSV/TSV buffer into rows. */
function parseCSV(buffer: Buffer): { rows: ParsedRow[]; errors: string[] } {
  const text = buffer.toString("utf8");
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h) => h.trim(),
  });

  return {
    rows: result.data.slice(0, MAX_PARSED_ROWS),
    errors: result.errors.map((e) => e.message).slice(0, 5),
  };
}

/** Extract rows from a worksheet of an already-parsed workbook. */
function rowsFromWorkbookSheet(
  wb: XLSX.WorkBook,
  sheetName: string
): { rows: ParsedRow[]; errors: string[] } {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { rows: [], errors: [`Sheet "${sheetName}" not found`] };

  const rows = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
    defval: null,
    raw: false,
  });

  return { rows: rows.slice(0, MAX_PARSED_ROWS) as ParsedRow[], errors: [] };
}

/** Parse JSON buffer into rows. */
function parseJSON(buffer: Buffer): { rows: ParsedRow[]; errors: string[] } {
  try {
    const data = JSON.parse(buffer.toString("utf8"));
    const arr = Array.isArray(data) ? data : data.data ?? [data];
    return {
      rows: (arr as ParsedRow[]).slice(0, MAX_PARSED_ROWS),
      errors: [],
    };
  } catch (err) {
    return { rows: [], errors: [`Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`] };
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  // ── Rate limit ────────────────────────────────────────────────────────
  const rl = rateLimit(`upload:${user.id}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limited. Retry in ${rl.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  // ── Parse multipart form ──────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId")?.toString();
  const name = formData.get("name")?.toString();
  const sheetName = formData.get("sheetName")?.toString();

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  // ── Authorization ─────────────────────────────────────────────────────
  try {
    await requireProjectRole(user, projectId, "EDITOR");
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // ── Size check (before reading into memory) ───────────────────────────
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    );
  }

  // ── Read buffer ───────────────────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());

  // ── Detect file type from extension ──────────────────────────────────
  const safeFilename = sanitiseFilename(file.name);
  const fileType = fileTypeFromExtension(safeFilename);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload CSV, XLSX, or JSON." },
      { status: 415 }
    );
  }

  // ── Magic-byte sniff ──────────────────────────────────────────────────
  const sniff = sniffFileType(buffer, fileType);
  if (!sniff.ok) {
    return NextResponse.json({ error: sniff.reason }, { status: 415 });
  }

  // ── All pre-flight checks passed → stream progress back to the client ─
  const description = formData.get("description")?.toString()?.trim().slice(0, 500) || null;
  const cleanName = name.trim().slice(0, 120) || safeFilename;

  // Resolve the parse targets. An XLSX workbook without an explicit sheet is
  // split into one dataset per worksheet; everything else is a single target.
  // The workbook is parsed exactly once and shared across every sheet.
  let workbook: XLSX.WorkBook | null = null;
  if (fileType === "XLSX") {
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    } catch {
      workbook = null;
    }
  }
  const targetSheets: string[] | null =
    fileType === "XLSX" && !sheetName ? workbook?.SheetNames ?? [] : null;

  if (fileType === "XLSX" && !sheetName && targetSheets && targetSheets.length === 0) {
    return NextResponse.json({ error: "Could not read workbook. No sheets found." }, { status: 422 });
  }

  const parseTargets: (string | null)[] = targetSheets ?? [sheetName ?? null];

  // Upload the original file once and share the path across every sheet's
  // dataset — they all derive from the same bytes.
  const storagePath = `${user.id}/${projectId}/${Date.now()}_${safeFilename}`;
  let finalStoragePath: string | null = null;
  try {
    finalStoragePath = await uploadToStorage(storagePath, buffer, file.type || "application/octet-stream");
  } catch (err) {
    console.error("[upload] Storage error:", err);
    // Continue without storage path — preview data is still useful in dev
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        emit({ type: "reading" });
        if (targetSheets) emit({ type: "sheets", sheets: targetSheets });

        const created: CreatedDataset[] = [];
        const skipped: string[] = [];

        for (const target of parseTargets) {
          const targetName = target ?? "file";
          emit({ type: "sheet", name: targetName });

          // Checksum scoped by sheet: every sheet of a workbook shares one
          // buffer, so an unscoped digest would flag sheets 2..n as duplicates
          // of sheet 1. Mixing the sheet name in keeps re-uploads of the
          // *same* sheet detectable.
          const checksum = createHash("sha256")
            .update(buffer)
            .update(target ? `sheet:${target}` : "")
            .digest("hex");
          const duplicate = await findDuplicateByChecksum(projectId, checksum);
          if (duplicate) {
            const reason = `Duplicate detected — an identical file "${duplicate.name}" was already uploaded.`;
            skipped.push(`${targetName}: ${reason}`);
            emit({ type: "sheet-skipped", name: targetName, reason });
            continue;
          }

          // Parse this target. The workbook was read once up front; only the
          // sheet extraction happens per target.
          let rows: ParsedRow[] = [];
          let parseErrors: string[] = [];

          if (fileType === "CSV") {
            ({ rows, errors: parseErrors } = parseCSV(buffer));
          } else if (fileType === "XLSX" && workbook) {
            ({ rows, errors: parseErrors } = rowsFromWorkbookSheet(workbook, target!));
          } else {
            ({ rows, errors: parseErrors } = parseJSON(buffer));
          }

          if (rows.length === 0) {
            const reason = parseErrors[0] ?? "File appears empty.";
            skipped.push(`${targetName}: ${reason}`);
            emit({ type: "sheet-skipped", name: targetName, reason });
            continue;
          }

          const columnCount = Math.min(Object.keys(rows[0] ?? {}).length, MAX_PARSED_COLUMNS);
          const schema = buildSchema(rows);
          // Store a preview subset in previewJson (capped at 2000 rows) to keep payload sizes efficient
          const previewRows = rows.slice(0, 2000);
          const finalName = target ? `${cleanName} - ${target}` : cleanName;

          // Persist dataset + initial version atomically.
          const dataset = await prisma.$transaction(async (tx) => {
            const ds = await tx.dataset.create({
              data: {
                name: finalName,
                description,
                fileType,
                fileSize: buffer.length,
                rowCount: rows.length,
                columnCount,
                schemaJson: schema,
                previewJson: previewRows,
                storagePath: finalStoragePath,
                checksum,
                status: "READY",
                projectId,
                uploadedById: user.id,
              },
              select: { id: true, name: true },
            });

            await tx.datasetVersion.create({
              data: {
                datasetId: ds.id,
                version: 1,
                label: "Initial upload",
                storagePath: finalStoragePath,
                rowCount: rows.length,
                checksum,
              },
            });

            return ds;
          });

          await logActivity({
            actorId: user.id,
            action: "DATASET_UPLOADED",
            projectId,
            metadata: {
              entityName: dataset.name,
              datasetId: dataset.id,
              fileType,
              fileSize: buffer.length,
              rowCount: rows.length,
            },
          });

          const entry: CreatedDataset = {
            id: dataset.id,
            name: dataset.name,
            rowCount: rows.length,
            columnCount,
            sheetName: target,
          };
          created.push(entry);
          emit({ type: "sheet-done", name: targetName, id: entry.id, rows: entry.rowCount, columns: entry.columnCount });
        }

        if (created.length === 0) {
          emit({
            type: "error",
            message: `Could not parse file. ${skipped[0]?.split(": ")[1] ?? "File appears empty."}`,
          });
        } else {
          emit({ type: "done", datasets: created, created: created.length, skipped });
        }
      } catch (err) {
        console.error("[upload] Streaming error:", err);
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "Upload failed. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
