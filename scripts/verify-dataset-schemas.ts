/**
 * Boundary tests for the Datasets validation schemas.
 *
 * The upload route and every dataset Server Action re-parse through these, so
 * the sanitizing, allowlist, and URL-filter rules are asserted directly rather
 * than only exercised through the UI.
 *
 * Run: npx tsx scripts/verify-dataset-schemas.ts
 */
import {
  uploadDatasetSchema,
  renameDatasetSchema,
  updateDatasetSchema,
  restoreVersionSchema,
  datasetFiltersSchema,
  fileTypeFromExtension,
  mimeTypeMatchesFileType,
  ACCEPTED_EXTENSIONS,
} from "../features/datasets/schemas";

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

group("uploadDatasetSchema — sanitization");
check("trims and collapses interior whitespace in the name", () => {
  return uploadDatasetSchema.parse({ projectId: "p", name: "  Q3   Sales  " }).name === "Q3 Sales";
});
check("strips ASCII control characters from the name", () => {
  return uploadDatasetSchema.parse({ projectId: "p", name: `Ab${CTRL}cd` }).name === "Abcd";
});
check("strips control characters from the description", () => {
  const parsed = uploadDatasetSchema.parse({ projectId: "p", name: "Valid", description: `a${CTRL}b` });
  return parsed.description === "ab";
});
check("keeps angle brackets verbatim (React escapes on render)", () => {
  const parsed = uploadDatasetSchema.parse({ projectId: "p", name: "<script>alert(1)</script>" });
  return parsed.name === "<script>alert(1)</script>";
});

group("uploadDatasetSchema — rejection");
check("rejects a missing projectId", () => {
  return !uploadDatasetSchema.safeParse({ projectId: "", name: "Valid" }).success;
});
check("rejects a name that sanitizes to empty", () => {
  return !uploadDatasetSchema.safeParse({ projectId: "p", name: `   ${CTRL}   ` }).success;
});
check("rejects a 121-character name", () => {
  return !uploadDatasetSchema.safeParse({ projectId: "p", name: "x".repeat(121) }).success;
});
check("accepts a 120-character name", () => {
  return uploadDatasetSchema.safeParse({ projectId: "p", name: "x".repeat(120) }).success;
});
check("rejects a 501-character description", () => {
  return !uploadDatasetSchema.safeParse({
    projectId: "p",
    name: "Valid",
    description: "x".repeat(501),
  }).success;
});

group("renameDatasetSchema / updateDatasetSchema");
check("rename sanitizes the same way as upload", () => {
  return renameDatasetSchema.parse({ id: "d", name: "  New   Name  " }).name === "New Name";
});
check("rename rejects an empty id", () => {
  return !renameDatasetSchema.safeParse({ id: "", name: "Valid" }).success;
});
check("rename rejects a whitespace-only name", () => {
  return !renameDatasetSchema.safeParse({ id: "d", name: "   " }).success;
});
check("update allows a description-only edit", () => {
  const parsed = updateDatasetSchema.safeParse({ id: "d", description: "Just the notes" });
  return parsed.success && parsed.data.name === undefined;
});
check("update still rejects an over-long name", () => {
  return !updateDatasetSchema.safeParse({ id: "d", name: "x".repeat(121) }).success;
});

group("restoreVersionSchema");
check("requires both datasetId and versionId", () => {
  return restoreVersionSchema.safeParse({ datasetId: "d", versionId: "v" }).success;
});
check("rejects a missing versionId — a restore must name its target", () => {
  return !restoreVersionSchema.safeParse({ datasetId: "d", versionId: "" }).success;
});

group("datasetFiltersSchema — URL input is untrusted");
check("defaults an empty query string to sane values", () => {
  const parsed = datasetFiltersSchema.parse({});
  return (
    parsed.fileType === "ALL" &&
    parsed.status === "ALL" &&
    parsed.sort === "recent" &&
    parsed.page === 1
  );
});
check("rejects an injected fileType value", () => {
  return !datasetFiltersSchema.safeParse({ fileType: "EXE" }).success;
});
check("rejects an injected status value", () => {
  return !datasetFiltersSchema.safeParse({ status: "SECRET" }).success;
});
check("rejects an injected sort column", () => {
  return !datasetFiltersSchema.safeParse({ sort: "ownerId" }).success;
});
check("rejects a negative page number", () => {
  return !datasetFiltersSchema.safeParse({ page: "-1" }).success;
});
check("rejects a fractional page number", () => {
  return !datasetFiltersSchema.safeParse({ page: "1.5" }).success;
});
check("coerces a numeric page string", () => {
  return datasetFiltersSchema.parse({ page: "3" }).page === 3;
});
check("rejects an over-long search term", () => {
  return !datasetFiltersSchema.safeParse({ q: "x".repeat(101) }).success;
});

group("fileTypeFromExtension — extension allowlist");
check("resolves .csv to CSV", () => fileTypeFromExtension("data.csv") === "CSV");
check("resolves .tsv to CSV (delimiter is sniffed, not assumed)", () => {
  return fileTypeFromExtension("data.tsv") === "CSV";
});
check("resolves .xlsx to XLSX", () => fileTypeFromExtension("book.xlsx") === "XLSX");
check("resolves .json to JSON", () => fileTypeFromExtension("payload.json") === "JSON");
check("is case-insensitive — Windows uploads arrive as .CSV", () => {
  return fileTypeFromExtension("DATA.CSV") === "CSV";
});
check("rejects a double extension by its final segment", () => {
  return fileTypeFromExtension("report.csv.exe") === null;
});
check("rejects an executable", () => fileTypeFromExtension("payload.exe") === null);
check("rejects a file with no extension", () => fileTypeFromExtension("README") === null);
check("every advertised extension resolves to a type", () => {
  return ACCEPTED_EXTENSIONS.every((ext) => fileTypeFromExtension(`file${ext}`) !== null);
});

group("mimeTypeMatchesFileType — declared MIME allowlist");
check("accepts text/csv for CSV", () => mimeTypeMatchesFileType("text/csv", "CSV"));
check("ignores a charset parameter", () => {
  return mimeTypeMatchesFileType("text/csv; charset=utf-8", "CSV");
});
check("is case-insensitive", () => mimeTypeMatchesFileType("TEXT/CSV", "CSV"));
check("accepts the Office Open XML type for XLSX", () => {
  return mimeTypeMatchesFileType(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "XLSX"
  );
});
check("rejects an unrelated MIME type for CSV", () => {
  return !mimeTypeMatchesFileType("application/x-msdownload", "CSV");
});
check("rejects a JSON MIME type declared as XLSX", () => {
  return !mimeTypeMatchesFileType("application/json", "XLSX");
});
check("rejects an empty MIME type", () => !mimeTypeMatchesFileType("", "CSV"));

console.log(
  failures === 0
    ? "\nALL DATASET SCHEMA CHECKS PASS"
    : `\n${failures} DATASET SCHEMA CHECK${failures === 1 ? "" : "S"} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
