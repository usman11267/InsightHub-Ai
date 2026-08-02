/**
 * Boundary tests for the upload guards.
 *
 * Extension and declared MIME type are both client-controlled, so the only
 * reliable format check is reading the leading bytes on the server. The
 * headline case: a zip archive renamed to `.csv` must be rejected.
 *
 * Run: npx tsx scripts/verify-upload-guards.ts
 */
import { sniffFileType, sanitiseFilename } from "../lib/file-validation";
import { MAX_UPLOAD_BYTES, MAX_PARSED_ROWS, MAX_PARSED_COLUMNS } from "../features/datasets/schemas";

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const CTRL = String.fromCharCode(0, 7, 27, 31, 127);

let failures = 0;

function check(name: string, assertion: () => boolean) {
  try {
    if (assertion()) {
      console.log(`  PASS  ${name}`);
    } else {
      failures++;
      console.log(`  FAIL  ${name}`);
    }
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name} — threw: ${(error as Error).message}`);
  }
}

function group(title: string) {
  console.log(`\n${title}`);
}

function zipFile(): Buffer {
  return Buffer.concat([ZIP_MAGIC, Buffer.from("[Content_Types].xml")]);
}

group("sniffFileType — a renamed archive is the attack this guard exists for");
check("rejects a zip declared as CSV", () => {
  const result = sniffFileType(zipFile(), "CSV");
  return !result.ok && result.reason.includes("XLSX/ZIP");
});
check("rejects a zip declared as JSON", () => {
  return !sniffFileType(zipFile(), "JSON").ok;
});
check("accepts a zip declared as XLSX", () => {
  const result = sniffFileType(zipFile(), "XLSX");
  return result.ok && result.detectedType === "XLSX";
});

group("sniffFileType — content must match the declared type");
check("accepts CSV text declared as CSV", () => {
  const result = sniffFileType(Buffer.from("a,b,c\n1,2,3\n"), "CSV");
  return result.ok && result.detectedType === "CSV";
});
check("accepts TSV text declared as CSV", () => {
  const result = sniffFileType(Buffer.from("a\tb\tc\n1\t2\t3\n"), "CSV");
  return result.ok && result.detectedType === "CSV";
});
check("accepts a JSON object declared as JSON", () => {
  const result = sniffFileType(Buffer.from('{"rows":[]}'), "JSON");
  return result.ok && result.detectedType === "JSON";
});
check("accepts a JSON array declared as JSON", () => {
  const result = sniffFileType(Buffer.from("[{ }]"), "JSON");
  return result.ok && result.detectedType === "JSON";
});
check("accepts leading whitespace before the JSON structure", () => {
  return sniffFileType(Buffer.from('\n\n  {"a":1}'), "JSON").ok;
});
check("rejects JSON content declared as CSV", () => {
  const result = sniffFileType(Buffer.from('{"a":1}'), "CSV");
  return !result.ok && result.reason.includes("JSON");
});
check("rejects CSV content declared as JSON", () => {
  return !sniffFileType(Buffer.from("a,b\n1,2\n"), "JSON").ok;
});
check("rejects CSV content declared as XLSX", () => {
  return !sniffFileType(Buffer.from("a,b\n1,2\n"), "XLSX").ok;
});

group("sniffFileType — binary and empty content");
check("rejects an empty file", () => {
  const result = sniffFileType(Buffer.alloc(0), "CSV");
  return !result.ok && result.reason.includes("empty");
});
check("rejects a binary blob declared as CSV", () => {
  const binary = Buffer.from(Array.from({ length: 512 }, (_, i) => i % 8));
  const result = sniffFileType(binary, "CSV");
  return !result.ok && result.reason.includes("binary");
});
check("does not misread tabs and newlines as binary", () => {
  return sniffFileType(Buffer.from("a\tb\r\n1\t2\r\n".repeat(50)), "CSV").ok;
});
check("accepts UTF-8 multi-byte text as CSV", () => {
  return sniffFileType(Buffer.from("naïve,café\n1,2\n", "utf8"), "CSV").ok;
});
check("accepts a JSON file too large to fully parse", () => {
  const big = Buffer.from(`[${'{"a":1},'.repeat(500)}{"a":1}]`);
  return sniffFileType(big, "JSON").ok;
});

group("sanitiseFilename — the stored name must not be a path");
check("strips forward-slash path components", () => {
  return !sanitiseFilename("../../etc/passwd").includes("/");
});
check("strips backslash path components", () => {
  return !sanitiseFilename("..\\..\\windows\\system32").includes("\\");
});
check("collapses traversal dot runs", () => {
  return !sanitiseFilename("..%2f..%2fdata.csv").includes("..");
});
check("strips control characters", () => {
  return sanitiseFilename(`report${CTRL}.csv`) === "report.csv";
});
check("caps the length at 200 characters", () => {
  return sanitiseFilename("x".repeat(500)).length <= 200;
});
check("leaves an ordinary filename intact", () => {
  return sanitiseFilename("Q3 Sales 2026.csv") === "Q3 Sales 2026.csv";
});

group("upload limits are bounded, not merely declared");
check("size cap is 25 MB", () => MAX_UPLOAD_BYTES === 25 * 1024 * 1024);
check("row cap bounds parse cost", () => MAX_PARSED_ROWS > 0 && MAX_PARSED_ROWS <= 1_000_000);
check("column cap bounds parse cost", () => MAX_PARSED_COLUMNS > 0 && MAX_PARSED_COLUMNS <= 4096);

console.log(
  failures === 0
    ? "\nALL UPLOAD GUARD CHECKS PASS"
    : `\n${failures} UPLOAD GUARD CHECK${failures === 1 ? "" : "S"} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
