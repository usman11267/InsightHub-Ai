import "server-only";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/auth";
import { effectiveRole, satisfiesRole } from "@/lib/roles";
import type { Role, User } from "@prisma/client";

export async function getProjectRole(userId: string, projectId: string): Promise<Role | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      members: { where: { userId }, select: { role: true }, take: 1 },
    },
  });

  if (!project) return null;
  return effectiveRole(userId, project.ownerId, project.members[0]?.role);
}

/** Throws ForbiddenError if the user lacks the required role on the project. */
export async function requireProjectRole(
  user: User,
  projectId: string,
  minimum: Role
): Promise<Role> {
  const role = await getProjectRole(user.id, projectId);
  if (!role) throw new ForbiddenError("Project not found or access denied");
  if (!satisfiesRole(role, minimum)) {
    throw new ForbiddenError(`This action requires the ${minimum} role`);
  }
  return role;
}
