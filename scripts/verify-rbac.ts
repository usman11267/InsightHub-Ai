/**
 * Authorization rule tests.
 *
 * These import the real `lib/roles` module rather than restating the hierarchy,
 * so a change to the rules shows up here instead of silently passing against a
 * stale copy.
 *
 * Run: npx tsx scripts/verify-rbac.ts
 */
import { ROLE_RANK, canDeleteProject, effectiveRole, satisfiesRole } from "../lib/roles";

const OWNER: string = "user_owner";
const MEMBER: string = "user_member";
const STRANGER: string = "user_stranger";

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

group("effectiveRole — ownership overrides membership");
check("owner is ADMIN with no membership row", () => {
  return effectiveRole(OWNER, OWNER, undefined) === "ADMIN";
});
check("owner is ADMIN even if downgraded to VIEWER as a member", () => {
  return effectiveRole(OWNER, OWNER, "VIEWER") === "ADMIN";
});
check("ADMIN member resolves to ADMIN", () => {
  return effectiveRole(MEMBER, OWNER, "ADMIN") === "ADMIN";
});
check("EDITOR member resolves to EDITOR", () => {
  return effectiveRole(MEMBER, OWNER, "EDITOR") === "EDITOR";
});
check("VIEWER member resolves to VIEWER", () => {
  return effectiveRole(MEMBER, OWNER, "VIEWER") === "VIEWER";
});
check("non-member resolves to null", () => {
  return effectiveRole(STRANGER, OWNER, undefined) === null;
});
check("explicit null membership resolves to null", () => {
  return effectiveRole(STRANGER, OWNER, null) === null;
});

group("satisfiesRole — hierarchy is strictly ordered");
check("rank order is ADMIN > EDITOR > VIEWER", () => {
  return ROLE_RANK.ADMIN > ROLE_RANK.EDITOR && ROLE_RANK.EDITOR > ROLE_RANK.VIEWER;
});
check("ADMIN satisfies ADMIN", () => satisfiesRole("ADMIN", "ADMIN"));
check("ADMIN satisfies EDITOR", () => satisfiesRole("ADMIN", "EDITOR"));
check("ADMIN satisfies VIEWER", () => satisfiesRole("ADMIN", "VIEWER"));
check("EDITOR satisfies EDITOR", () => satisfiesRole("EDITOR", "EDITOR"));
check("EDITOR satisfies VIEWER", () => satisfiesRole("EDITOR", "VIEWER"));
check("EDITOR does NOT satisfy ADMIN", () => !satisfiesRole("EDITOR", "ADMIN"));
check("VIEWER satisfies VIEWER", () => satisfiesRole("VIEWER", "VIEWER"));
check("VIEWER does NOT satisfy EDITOR", () => !satisfiesRole("VIEWER", "EDITOR"));
check("VIEWER does NOT satisfy ADMIN", () => !satisfiesRole("VIEWER", "ADMIN"));
check("null never satisfies VIEWER", () => !satisfiesRole(null, "VIEWER"));
check("null never satisfies ADMIN", () => !satisfiesRole(null, "ADMIN"));

group("derived list permissions match the detail page");
const cases = [
  { label: "owner", userId: OWNER, memberRole: undefined, canEdit: true, canManage: true },
  { label: "admin member", userId: MEMBER, memberRole: "ADMIN" as const, canEdit: true, canManage: true },
  { label: "editor member", userId: MEMBER, memberRole: "EDITOR" as const, canEdit: true, canManage: false },
  { label: "viewer member", userId: MEMBER, memberRole: "VIEWER" as const, canEdit: false, canManage: false },
  { label: "non-member", userId: STRANGER, memberRole: undefined, canEdit: false, canManage: false },
];

for (const c of cases) {
  const role = effectiveRole(c.userId, OWNER, c.memberRole);
  check(`${c.label}: canEdit === ${c.canEdit}`, () => satisfiesRole(role, "EDITOR") === c.canEdit);
  check(`${c.label}: canManage === ${c.canManage}`, () => satisfiesRole(role, "ADMIN") === c.canManage);
}

group("delete is owner-only, not merely ADMIN");
check("owner can delete", () => canDeleteProject(OWNER, OWNER));
check("ADMIN collaborator cannot delete", () => {
  // The ADMIN role grants management rights but not destruction rights, so the
  // two predicates must disagree for this user.
  const role = effectiveRole(MEMBER, OWNER, "ADMIN");
  return satisfiesRole(role, "ADMIN") && !canDeleteProject(MEMBER, OWNER);
});
check("EDITOR collaborator cannot delete", () => !canDeleteProject(MEMBER, OWNER));
check("non-member cannot delete", () => !canDeleteProject(STRANGER, OWNER));

console.log(
  failures === 0
    ? "\nALL RBAC CHECKS PASS"
    : `\n${failures} RBAC CHECK${failures === 1 ? "" : "S"} FAILED`
);
process.exit(failures === 0 ? 0 : 1);
