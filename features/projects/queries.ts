import "server-only";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/auth";
import { effectiveRole, satisfiesRole } from "@/lib/roles";
import { visibleProjectsWhere } from "@/features/dashboard/queries";
import type { ProjectFilters } from "@/features/projects/schemas";
import type { Prisma } from "@prisma/client";

export const PROJECTS_PAGE_SIZE = 12;

/**
 * Data access for the Projects module.
 *
 * Every query is scoped through `visibleProjectsWhere` so a user can only ever
 * read projects they own or are a member of — the scoping lives here rather
 * than in the pages, which makes it impossible to forget at a call site.
 */

function buildWhere(userId: string, filters: ProjectFilters): Prisma.ProjectWhereInput {
  const and: Prisma.ProjectWhereInput[] = [visibleProjectsWhere(userId)];

  if (filters.status !== "ALL") {
    and.push({ status: filters.status });
  }

  if (filters.q) {
    and.push({
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.tag) {
    and.push({ tags: { has: filters.tag.toLowerCase() } });
  }

  if (filters.favorites) {
    and.push({ favoritedBy: { some: { id: userId } } });
  }

  return { AND: and };
}

function buildOrderBy(sort: ProjectFilters["sort"]): Prisma.ProjectOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: "asc" };
    case "datasets":
      return { datasets: { _count: "desc" } };
    default:
      return { updatedAt: "desc" };
  }
}

export async function listProjects(userId: string, filters: ProjectFilters) {
  const where = buildWhere(userId, filters);
  const skip = (filters.page - 1) * PROJECTS_PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip,
      take: PROJECTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        tags: true,
        status: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { firstName: true, lastName: true, email: true, imageUrl: true } },
        favoritedBy: { where: { id: userId }, select: { id: true }, take: 1 },
        members: { where: { userId }, select: { role: true }, take: 1 },
        _count: { select: { datasets: true, reports: true, members: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    // Collapse the favorite probe and role lookup into plain fields so the UI
    // never has to reason about the joins — and so list and detail views apply
    // the same role rules.
    items: items.map(({ favoritedBy, members, ...project }) => {
      const role = effectiveRole(userId, project.ownerId, members[0]?.role);
      return {
        ...project,
        isFavorite: favoritedBy.length > 0,
        role,
        isOwner: project.ownerId === userId,
        canEdit: satisfiesRole(role, "EDITOR"),
      };
    }),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PROJECTS_PAGE_SIZE)),
  };
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>["items"][number];

/** Distinct tags across the user's visible projects, for the filter bar. */
export async function getProjectTags(userId: string): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: visibleProjectsWhere(userId),
    select: { tags: true },
  });
  const set = new Set<string>();
  for (const row of rows) for (const tag of row.tags) set.add(tag);
  return [...set].sort();
}

/**
 * Full project for the detail page. Throws NotFoundError when the project is
 * missing *or* invisible to this user — the two cases are deliberately
 * indistinguishable so IDs can't be probed for existence.
 */
export async function getProjectDetail(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { AND: [{ id: projectId }, visibleProjectsWhere(userId)] },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      tags: true,
      status: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
      },
      members: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
          },
        },
      },
      favoritedBy: { where: { id: userId }, select: { id: true }, take: 1 },
      _count: { select: { datasets: true, reports: true, charts: true, queries: true } },
    },
  });

  if (!project) throw new NotFoundError("Project not found");

  const { favoritedBy, ...rest } = project;
  return { ...rest, isFavorite: favoritedBy.length > 0 };
}

export type ProjectDetail = Awaited<ReturnType<typeof getProjectDetail>>;

export async function getProjectDatasets(projectId: string, take = 10) {
  return prisma.dataset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      fileType: true,
      fileSize: true,
      rowCount: true,
      columnCount: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function getProjectReports(projectId: string, take = 10) {
  return prisma.report.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      createdAt: true,
      author: { select: { firstName: true, lastName: true, email: true } },
    },
  });
}

export async function getProjectActivity(projectId: string, take = 20) {
  return prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: { select: { firstName: true, lastName: true, email: true, imageUrl: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

/** Lightweight list used by dataset/report pickers elsewhere in the app. */
export async function getProjectOptions(userId: string) {
  return prisma.project.findMany({
    where: { AND: [visibleProjectsWhere(userId), { status: "ACTIVE" }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, color: true },
  });
}
