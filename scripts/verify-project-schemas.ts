/**
 * Boundary tests for the Projects validation schemas.
 *
 * These schemas are the server-side trust boundary — every Server Action
 * re-parses through them — so the sanitizing and rejection rules are asserted
 * directly rather than only exercised through the UI.
 *
 * Run: npx tsx scripts/verify-project-schemas.ts
 */
import {
  createProjectSchema,
  updateProjectSchema,
  projectFiltersSchema,
  inviteMemberSchema,
} from "../features/projects/schemas";

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

group("createProjectSchema — sanitization");
check("trims and collapses interior whitespace", () => {
  return createProjectSchema.parse({ name: "  My   Project  " }).name === "My Project";
});
check("strips ASCII control characters", () => {
  return createProjectSchema.parse({ name: `Ab${CTRL}cd` }).name === "Abcd";
});
check("strips control chars from description", () => {
  const parsed = createProjectSchema.parse({ name: "Valid", description: `a${CTRL}b` });
  return parsed.description === "ab";
});
check("keeps angle brackets verbatim (React escapes on render)", () => {
  const parsed = createProjectSchema.parse({ name: "<script>alert(1)</script>" });
  return parsed.name === "<script>alert(1)</script>";
});

group("createProjectSchema — rejection");
check("rejects a 1-character name", () => !createProjectSchema.safeParse({ name: "a" }).success);
check("rejects a whitespace-only name", () => !createProjectSchema.safeParse({ name: "   " }).success);
check("rejects an 81-character name", () => {
  return !createProjectSchema.safeParse({ name: "x".repeat(81) }).success;
});
check("rejects a 501-character description", () => {
  return !createProjectSchema.safeParse({ name: "Valid", description: "x".repeat(501) }).success;
});
check("rejects a non-hex color", () => {
  return !createProjectSchema.safeParse({ name: "Valid", color: "red" }).success;
});
check("rejects a javascript: URL in color", () => {
  return !createProjectSchema.safeParse({ name: "Valid", color: "javascript:alert(1)" }).success;
});
check("rejects 3-digit shorthand hex", () => {
  return !createProjectSchema.safeParse({ name: "Valid", color: "#fff" }).success;
});
check("rejects more than 8 tags", () => {
  const tags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
  return !createProjectSchema.safeParse({ name: "Valid", tags }).success;
});

group("createProjectSchema — defaults and normalization");
check("defaults color to the first swatch", () => {
  return createProjectSchema.parse({ name: "Valid" }).color === "#6d5df6";
});
check("defaults tags to an empty array", () => {
  return createProjectSchema.parse({ name: "Valid" }).tags.length === 0;
});
check("lowercases and dedupes tags", () => {
  const parsed = createProjectSchema.parse({ name: "Valid", tags: ["Sales", "sales", "Ops"] });
  return JSON.stringify(parsed.tags) === '["sales","ops"]';
});
check("drops tags that sanitize to empty", () => {
  const parsed = createProjectSchema.parse({ name: "Valid", tags: ["ok", "   "] });
  return JSON.stringify(parsed.tags) === '["ok"]';
});

group("updateProjectSchema");
check("requires an id", () => !updateProjectSchema.safeParse({ name: "Valid" }).success);
check("accepts a partial patch with only an id", () => {
  return updateProjectSchema.safeParse({ id: "abc" }).success;
});
check("rejects an unknown status", () => {
  return !updateProjectSchema.safeParse({ id: "abc", status: "DELETED" }).success;
});
check("accepts ARCHIVED", () => {
  return updateProjectSchema.safeParse({ id: "abc", status: "ARCHIVED" }).success;
});

group("projectFiltersSchema — URL input is untrusted");
check("empty query string yields safe defaults", () => {
  const f = projectFiltersSchema.parse({});
  return f.status === "ACTIVE" && f.sort === "recent" && f.page === 1 && f.favorites === false;
});
check("rejects an injected sort value", () => {
  return !projectFiltersSchema.safeParse({ sort: "name; DROP TABLE projects" }).success;
});
check("rejects an unknown status", () => {
  return !projectFiltersSchema.safeParse({ status: "SECRET" }).success;
});
check("rejects page 0", () => !projectFiltersSchema.safeParse({ page: "0" }).success);
check("rejects a negative page", () => !projectFiltersSchema.safeParse({ page: "-5" }).success);
check("rejects a non-numeric page", () => !projectFiltersSchema.safeParse({ page: "abc" }).success);
check("coerces a numeric page string", () => projectFiltersSchema.parse({ page: "3" }).page === 3);
check("rejects a 101-character search term", () => {
  return !projectFiltersSchema.safeParse({ q: "x".repeat(101) }).success;
});

group("inviteMemberSchema");
check("lowercases the email", () => {
  const parsed = inviteMemberSchema.parse({ projectId: "p", email: "A@B.COM", role: "VIEWER" });
  return parsed.email === "a@b.com";
});
check("rejects a malformed email", () => {
  return !inviteMemberSchema.safeParse({ projectId: "p", email: "nope", role: "VIEWER" }).success;
});
check("rejects a privilege-escalating role", () => {
  return !inviteMemberSchema.safeParse({ projectId: "p", email: "a@b.com", role: "OWNER" }).success;
});
check("rejects an empty projectId", () => {
  return !inviteMemberSchema.safeParse({ projectId: "", email: "a@b.com", role: "VIEWER" }).success;
});

console.log(
  failures === 0
    ? "\nALL SCHEMA CHECKS PASS"
    : `\n${failures} SCHEMA CHECK${failures === 1 ? "" : "S"} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
