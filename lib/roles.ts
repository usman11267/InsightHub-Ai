import type { Role } from "@prisma/client";

/**
 * Pure role-hierarchy rules: ADMIN > EDITOR > VIEWER.
 *
 * Kept free of `server-only` and of any database access so the authorization
 * rules can be asserted directly in tests. The DB-backed lookups that feed
 * these functions live in `lib/authorization.ts`.
 */
export const ROLE_RANK: Record<Role, number> = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };

/** True when `role` meets or exceeds `minimum`. A null role never satisfies anything. */
export function satisfiesRole(role: Role | null, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/**
 * The effective role a user holds on a project, given ownership and an optional
 * membership row. Owners are always ADMIN — ownership is not stored as a
 * TeamMember, so it has to be folded in here.
 */
export function effectiveRole(
  userId: string,
  ownerId: string,
  memberRole: Role | null | undefined
): Role | null {
  if (ownerId === userId) return "ADMIN";
  return memberRole ?? null;
}

/**
 * Deletion is owner-only by design. An ADMIN collaborator can manage a project
 * — invite, change roles, archive — but must not be able to destroy data that
 * belongs to someone else, so this is an ownership check rather than a role check.
 */
export function canDeleteProject(userId: string, ownerId: string): boolean {
  return userId === ownerId;
}

