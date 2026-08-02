"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError, NotFoundError } from "@/lib/auth";
import { requireProjectRole, getProjectRole } from "@/lib/authorization";
import { canDeleteProject } from "@/lib/roles";
import { logActivity, notifyUser } from "@/lib/activity";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "@/features/projects/schemas";

/**
 * Server Actions for the Projects module.
 *
 * House rules, applied uniformly:
 *  1. `requireUser()` first — never trust a client-supplied user id.
 *  2. Validate with Zod before touching the database.
 *  3. `requireProjectRole()` for anything scoped to an existing project.
 *  4. Rate-limit mutations per user.
 *  5. Return `ActionResult` rather than throwing, so forms can render errors.
 */

function revalidateProject(projectId?: string) {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  if (projectId) revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function createProject(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:create:${user.id}`, { limit: 20, windowMs: 60_000 });

    const data = createProjectSchema.parse(input);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description || null,
        color: data.color,
        tags: data.tags,
        ownerId: user.id,
      },
      select: { id: true, name: true },
    });

    await logActivity({
      actorId: user.id,
      action: "PROJECT_CREATED",
      projectId: project.id,
      metadata: { entityName: project.name },
    });

    revalidateProject(project.id);
    return { success: true, data: { id: project.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProject(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:update:${user.id}`, { limit: 40, windowMs: 60_000 });

    const { id, ...changes } = updateProjectSchema.parse(input);
    await requireProjectRole(user, id, "EDITOR");

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.description !== undefined && {
          description: changes.description || null,
        }),
        ...(changes.color !== undefined && { color: changes.color }),
        ...(changes.tags !== undefined && { tags: changes.tags }),
        ...(changes.status !== undefined && { status: changes.status }),
      },
      select: { name: true },
    });

    await logActivity({
      actorId: user.id,
      action: "PROJECT_UPDATED",
      projectId: id,
      metadata: { entityName: project.name, fields: Object.keys(changes) },
    });

    revalidateProject(id);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteProject(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:delete:${user.id}`, { limit: 10, windowMs: 60_000 });

    const { id } = projectIdSchema.parse(input);

    // Deletion is owner-only: an ADMIN collaborator can manage a project but
    // must not be able to destroy someone else's data.
    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, name: true },
    });
    if (!project) throw new NotFoundError("Project not found");
    if (!canDeleteProject(user.id, project.ownerId)) {
      throw new ForbiddenError("Only the project owner can delete this project");
    }

    // Cascades remove datasets, reports, charts, queries, and members.
    await prisma.project.delete({ where: { id } });

    await logActivity({
      actorId: user.id,
      action: "PROJECT_DELETED",
      metadata: { entityName: project.name },
    });

    revalidateProject();
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleFavorite(
  input: unknown
): Promise<ActionResult<{ isFavorite: boolean }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:favorite:${user.id}`, { limit: 60, windowMs: 60_000 });

    const { id } = projectIdSchema.parse(input);
    const role = await getProjectRole(user.id, id);
    if (!role) throw new NotFoundError("Project not found");

    const existing = await prisma.project.findFirst({
      where: { id, favoritedBy: { some: { id: user.id } } },
      select: { id: true },
    });

    await prisma.project.update({
      where: { id },
      data: {
        favoritedBy: existing
          ? { disconnect: { id: user.id } }
          : { connect: { id: user.id } },
      },
    });

    revalidateProject(id);
    return { success: true, data: { isFavorite: !existing } };
  } catch (error) {
    return actionError(error);
  }
}

export async function inviteMember(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:invite:${user.id}`, { limit: 20, windowMs: 60_000 });

    const { projectId, email, role } = inviteMemberSchema.parse(input);
    await requireProjectRole(user, projectId, "ADMIN");

    const invitee = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!invitee) {
      return {
        success: false,
        error: "No InsightHub account uses that email yet. Ask them to sign up first.",
      };
    }

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { name: true, ownerId: true },
    });

    if (invitee.id === project.ownerId) {
      return { success: false, error: "That user already owns this project." };
    }

    await prisma.teamMember.upsert({
      where: { userId_projectId: { userId: invitee.id, projectId } },
      update: { role },
      create: { userId: invitee.id, projectId, role },
    });

    await Promise.all([
      logActivity({
        actorId: user.id,
        action: "MEMBER_INVITED",
        projectId,
        metadata: { email, role },
      }),
      notifyUser({
        userId: invitee.id,
        title: `You were added to ${project.name}`,
        body: `Your role is ${role.toLowerCase()}.`,
        href: `/dashboard/projects/${projectId}`,
      }),
    ]);

    revalidateProject(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateMemberRole(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:member-role:${user.id}`, { limit: 30, windowMs: 60_000 });

    const { projectId, memberId, role } = updateMemberRoleSchema.parse(input);
    await requireProjectRole(user, projectId, "ADMIN");

    // Scope the update by projectId too, so a member id from another project
    // can't be redirected into this one.
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true, user: { select: { id: true, email: true } } },
    });
    if (!member) throw new NotFoundError("Member not found on this project");

    await prisma.teamMember.update({ where: { id: member.id }, data: { role } });

    await logActivity({
      actorId: user.id,
      action: "MEMBER_ROLE_CHANGED",
      projectId,
      metadata: { email: member.user.email, role },
    });

    revalidateProject(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeMember(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`project:member-remove:${user.id}`, { limit: 30, windowMs: 60_000 });

    const { projectId, memberId } = removeMemberSchema.parse(input);

    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, projectId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });
    if (!member) throw new NotFoundError("Member not found on this project");

    // Admins can remove anyone; members may always remove themselves.
    const isSelf = member.userId === user.id;
    if (!isSelf) await requireProjectRole(user, projectId, "ADMIN");

    await prisma.teamMember.delete({ where: { id: member.id } });

    await logActivity({
      actorId: user.id,
      action: "MEMBER_REMOVED",
      projectId,
      metadata: { email: member.user.email, self: isSelf },
    });

    revalidateProject(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
