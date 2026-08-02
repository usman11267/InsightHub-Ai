import { z } from "zod";

/**
 * Validation contracts for the Datasets module. Shared verbatim between the
 * client forms (React Hook Form resolver) and the Server Actions / upload route,
 * so a payload that passes in the browser is exactly what the server accepts.
 */

/**
 * C0 control characters plus DEL. Built via RegExp so the source file itself
 * stays printable-ASCII and survives copy/paste and tooling that mangles raw bytes.
 */
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

/** Strips control characters and collapses runs of whitespace. */
const sanitizedText = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

/**
 * Upload limits.
 *
 * The size cap is enforced while streaming rather than after buffering, so an
 * oversized file is aborted instead of being read into memory. The row and
 * column caps bound parse cost — a file can be within the byte limit and still
 * be pathological (a million columns, say).
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PARSED_ROWS = 100_000;
export const MAX_PARSED_COLUMNS = 512;
export const PREVIEW_ROW_COUNT = 100;

/**
 * Accepted upload formats, keyed by the `FileType` enum in the Prisma schema.
 *
 * `extensions` and `mimeTypes` are both allowlists rather than blocklists: an
 * unrecognized value is rejected, so a new format can only ever be added
 * deliberately. `.tsv` and `.txt` map to CSV because the parser sniffs the
 * delimiter rather than assuming commas.
 */
export const ACCEPTED_FILE_TYPES = {
  CSV: {
    extensions: [".csv", ".tsv", ".txt"],
    mimeTypes: [
      "text/csv",
      "text/plain",
      "text/tab-separated-values",
      "application/csv",
      // Windows Excel sets this on CSV files it has touched.
      "application/vnd.ms-excel",
    ],
  },
  XLSX: {
    extensions: [".xlsx", ".xls"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ],
  },
  JSON: {
    extensions: [".json"],
    mimeTypes: ["application/json", "text/json", "text/plain"],
  },
} as const;

export type AcceptedFileType = keyof typeof ACCEPTED_FILE_TYPES;

/** Flat extension allowlist, for the dropzone's `accept` config and error copy. */
export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES).flatMap(
  (entry) => entry.extensions
);

/**
 * Resolves an extension to its `FileType`, or null when unrecognized.
 *
 * Case-insensitive, because Windows uploads arrive as `.CSV` routinely. Only the
 * final extension is considered, so `report.csv.exe` resolves to `.exe` and is
 * rejected rather than being read as a CSV.
 */
export function fileTypeFromExtension(filename: string): AcceptedFileType | null {
  const match = /\.[^.]+$/.exec(filename.toLowerCase());
  if (!match) return null;

  const extension = match[0];
  for (const [type, config] of Object.entries(ACCEPTED_FILE_TYPES)) {
    if ((config.extensions as readonly string[]).includes(extension)) {
      return type as AcceptedFileType;
    }
  }
  return null;
}

/** True when the browser-declared MIME type is plausible for this `FileType`. */
export function mimeTypeMatchesFileType(
  mimeType: string,
  fileType: AcceptedFileType
): boolean {
  // Strip any `; charset=utf-8` parameter before comparing.
  const bare = mimeType.split(";")[0].trim().toLowerCase();
  if (!bare) return false;
  return (ACCEPTED_FILE_TYPES[fileType].mimeTypes as readonly string[]).includes(bare);
}

/**
 * Upload metadata. The file itself is validated separately in the route handler,
 * because a Zod schema can check a declared name and size but cannot inspect
 * bytes — see `lib/file-validation.ts` for the magic-byte sniff.
 */
export const uploadDatasetSchema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  name: sanitizedText(120).pipe(z.string().min(1, "Name is required")),
  description: sanitizedText(500).optional(),
});

export const renameDatasetSchema = z.object({
  id: z.string().min(1),
  name: sanitizedText(120).pipe(z.string().min(1, "Name is required")),
});

export const updateDatasetSchema = z.object({
  id: z.string().min(1),
  name: sanitizedText(120).pipe(z.string().min(1, "Name is required")).optional(),
  description: sanitizedText(500).optional(),
});

export const datasetIdSchema = z.object({ id: z.string().min(1) });

export const restoreVersionSchema = z.object({
  datasetId: z.string().min(1),
  versionId: z.string().min(1),
});

/** List filters read straight off the URL, so every value arrives as a string. */
export const datasetFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  projectId: z.string().trim().max(40).optional(),
  fileType: z.enum(["CSV", "XLSX", "JSON", "ALL"]).default("ALL"),
  status: z.enum(["PROCESSING", "READY", "ERROR", "ALL"]).default("ALL"),
  sort: z.enum(["recent", "name", "size", "rows"]).default("recent"),
  page: z.coerce.number().int().min(1).default(1),
});

export type UploadDatasetInput = z.input<typeof uploadDatasetSchema>;
export type UpdateDatasetInput = z.input<typeof updateDatasetSchema>;
export type DatasetFilters = z.output<typeof datasetFiltersSchema>;
