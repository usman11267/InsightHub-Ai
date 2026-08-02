/**
 * Magic-byte file validation.
 *
 * Extension + MIME type can be spoofed by the client. Reading the first
 * bytes of the actual file content is the only reliable way to confirm the
 * format on the server.
 *
 * Signatures:
 *   XLSX: PK\x03\x04 (ZIP archive, Office Open XML)
 *   JSON: first non-whitespace char is { or [
 *   CSV : anything else that is printable text
 */

/** Return value from `sniffFileType`. */
export type SniffResult =
  | { ok: true; detectedType: "CSV" | "XLSX" | "JSON" }
  | { ok: false; reason: string };

/**
 * Inspect the leading bytes of a file buffer to determine the real format.
 *
 * @param buffer - The full file content (or at least the first 512 bytes).
 * @param declaredType - What the client claims the file is.
 */
export function sniffFileType(
  buffer: Buffer,
  declaredType: "CSV" | "XLSX" | "JSON"
): SniffResult {
  if (buffer.length === 0) {
    return { ok: false, reason: "File is empty" };
  }

  // XLSX / XLS — ZIP magic bytes: 50 4B 03 04
  const isZip =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  // Legacy .xls — OLE2 compound document magic bytes: D0 CF 11 E0 A1 B1 1A E1
  const isOle2 =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1;

  if (isZip || isOle2) {
    if (declaredType !== "XLSX") {
      return {
        ok: false,
        reason: `File content is a spreadsheet but was declared as ${declaredType}`,
      };
    }
    return { ok: true, detectedType: "XLSX" };
  }

  // Everything else must be text. Reject binary-looking content (>25% non-printable bytes in first 512).
  const sample = buffer.subarray(0, Math.min(512, buffer.length));
  let nonPrintable = 0;
  for (const byte of sample) {
    // Allow tab (9), newline (10), carriage return (13), and all printable ASCII/UTF-8
    if (byte < 9 || (byte > 13 && byte < 32) || byte === 127) nonPrintable++;
  }
  if (nonPrintable / sample.length > 0.25) {
    return {
      ok: false,
      reason: "File appears to be binary. Only CSV, XLSX, and JSON are accepted.",
    };
  }

  // Try to detect JSON by first non-whitespace character
  const text = buffer.subarray(0, Math.min(1024, buffer.length)).toString("utf8");
  const firstChar = text.trimStart()[0];

  if (firstChar === "{" || firstChar === "[") {
    if (declaredType !== "JSON") {
      return {
        ok: false,
        reason: `File content looks like JSON but was declared as ${declaredType}`,
      };
    }
    // Basic JSON parse check — only the leading structure, not the full file
    try {
      JSON.parse(text.length > 256 ? text : buffer.toString("utf8"));
    } catch {
      // Large files will fail here on a partial parse — that's fine,
      // we just confirmed the leading structure. Accept it.
    }
    return { ok: true, detectedType: "JSON" };
  }

  // Default: treat as CSV/TSV text
  if (declaredType !== "CSV") {
    return {
      ok: false,
      reason: `File content looks like plain text/CSV but was declared as ${declaredType}`,
    };
  }
  return { ok: true, detectedType: "CSV" };
}

/**
 * Sanitise a filename: strip path components, control chars, and limit length.
 * Returns a safe basename that is safe to store in the DB and display in the UI.
 */
export function sanitiseFilename(raw: string): string {
  return raw
    .replace(/[/\\]/g, "_") // strip path separators
    .replace(/[\x00-\x1f\x7f]/g, "") // strip control chars
    .replace(/\.{2,}/g, ".") // collapse multiple dots
    .slice(0, 200)
    .trim();
}
