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
  PREVIEW_ROW_COUNT,
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

/** Parse XLSX buffer into rows. */
function parseXLSX(buffer: Buffer, targetSheetName?: string): { rows: ParsedRow[]; errors: string[]; sheets: string[]; requireSelection: boolean } {
  try {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    
    if (wb.SheetNames.length === 0) return { rows: [], errors: ["No sheets found in workbook"], sheets: [], requireSelection: false };
    
    if (wb.SheetNames.length > 1 && !targetSheetName) {
      return { rows: [], errors: [], sheets: wb.SheetNames, requireSelection: true };
    }

    const sheetName = targetSheetName || wb.SheetNames[0];
    if (!sheetName || !wb.Sheets[sheetName]) return { rows: [], errors: [`Sheet "${sheetName}" not found`], sheets: wb.SheetNames, requireSelection: false };

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
      defval: null,
      raw: false,
    });

    return { rows: rows.slice(0, MAX_PARSED_ROWS) as ParsedRow[], errors: [], sheets: wb.SheetNames, requireSelection: false };
  } catch (err) {
    return { rows: [], errors: [`Failed to parse XLSX: ${err instanceof Error ? err.message : "Unknown error"}`], sheets: [], requireSelection: false };
  }
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

  // ── Checksum & duplicate detection ───────────────────────────────────
  // Scoped by sheet: every sheet of a workbook shares one file buffer, so an
  // unscoped digest would flag sheets 2..n as duplicates of sheet 1. Mixing
  // the sheet name in keeps re-uploads of the *same* sheet detectable.
  const checksum = createHash("sha256")
    .update(buffer)
    .update(sheetName ? ` sheet:${sheetName}` : "")
    .digest("hex");
  const duplicate = await findDuplicateByChecksum(projectId, checksum);
  if (duplicate) {
    return NextResponse.json(
      {
        error: `Duplicate detected. An identical file "${duplicate.name}" was already uploaded.`,
        duplicateId: duplicate.id,
      },
      { status: 409 }
    );
  }

  // ── Parse ─────────────────────────────────────────────────────────────
  let rows: ParsedRow[] = [];
  let parseErrors: string[] = [];

  if (fileType === "CSV") {
    ({ rows, errors: parseErrors } = parseCSV(buffer));
  } else if (fileType === "XLSX") {
    const result = parseXLSX(buffer, sheetName);
    if (result.requireSelection) {
      return NextResponse.json({ requireSelection: true, sheets: result.sheets }, { status: 200 });
    }
    rows = result.rows;
    parseErrors = result.errors;
  } else {
    ({ rows, errors: parseErrors } = parseJSON(buffer));
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: `Could not parse file. ${parseErrors[0] ?? "File appears empty."}` },
      { status: 422 }
    );
  }

  const columnCount = Math.min(Object.keys(rows[0] ?? {}).length, MAX_PARSED_COLUMNS);
  const schema = buildSchema(rows);
  const previewRows = rows.slice(0, PREVIEW_ROW_COUNT);

  // ── Upload to storage ─────────────────────────────────────────────────
  const storagePath = `${user.id}/${projectId}/${Date.now()}_${safeFilename}`;
  let finalStoragePath: string | null = null;

  try {
    finalStoragePath = await uploadToStorage(storagePath, buffer, file.type || "application/octet-stream");
  } catch (err) {
    console.error("[upload] Storage error:", err);
    // Continue without storage path — preview data is still useful in dev
  }

  // ── Persist to DB ──────────────────────────────────────────────────────
  const cleanName = name.trim().slice(0, 120) || safeFilename;
  const finalName = sheetName ? `${cleanName} - ${sheetName}` : cleanName;
  const description = formData.get("description")?.toString()?.trim().slice(0, 500) || null;

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

  return NextResponse.json(
    {
      id: dataset.id,
      name: dataset.name,
      rowCount: rows.length,
      columnCount,
      parseWarnings: parseErrors,
    },
    { status: 201 }
  );
}
