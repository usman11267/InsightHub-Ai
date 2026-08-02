import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/auth";
import { effectiveRole, satisfiesRole } from "@/lib/roles";
import { visibleProjectsWhere } from "@/features/dashboard/queries";
import type { DatasetFilters } from "@/features/datasets/schemas";
import type { Prisma } from "@prisma/client";

export const DATASETS_PAGE_SIZE = 12;

/**
 * Data access for the Datasets module.
 *
 * Dataset access is inherited from project access — there is no separate dataset
 * ACL. Every query therefore constrains `project` through
 * `visibleProjectsWhere(userId)` rather than filtering on the dataset alone. The
 * scoping lives here rather than in the pages, which makes it impossible to
 * forget at a call site.
 */

/** A dataset is visible exactly when its parent project is. */
function visibleDatasetsWhere(userId: string): Prisma.DatasetWhereInput {
  return { project: visibleProjectsWhere(userId) };
}

function buildWhere(userId: string, filters: DatasetFilters): Prisma.DatasetWhereInput {
  const and: Prisma.DatasetWhereInput[] = [visibleDatasetsWhere(userId)];

  if (filters.projectId) {
    and.push({ projectId: filters.projectId });
  }

  if (filters.fileType !== "ALL") {
    and.push({ fileType: filters.fileType });
  }

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

  return { AND: and };
}

function buildOrderBy(
  sort: DatasetFilters["sort"]
): Prisma.DatasetOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: "asc" };
    case "size":
      return { fileSize: "desc" };
    case "rows":
      return { rowCount: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export const listDatasets = cache(async function listDatasets(userId: string, filters: DatasetFilters) {
  const where = buildWhere(userId, filters);
  const skip = (filters.page - 1) * DATASETS_PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.dataset.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      skip,
      take: DATASETS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        description: true,
        fileType: true,
        fileSize: true,
        rowCount: true,
        columnCount: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        uploadedById: true,
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            ownerId: true,
            members: { where: { userId }, select: { role: true }, take: 1 },
          },
        },
        uploadedBy: {
          select: { firstName: true, lastName: true, email: true, imageUrl: true },
        },
        _count: { select: { versions: true, reports: true, charts: true } },
      },
    }),
    prisma.dataset.count({ where }),
  ]);

  return {
    // Collapse the membership join into plain permission fields so the UI never
    // has to reason about roles — and so the list and detail views can't drift.
    items: items.map(({ project, ...dataset }) => {
      const role = effectiveRole(userId, project.ownerId, project.members[0]?.role);
      return {
        ...dataset,
        project: { id: project.id, name: project.name, color: project.color },
        canEdit: satisfiesRole(role, "EDITOR"),
        canDelete: satisfiesRole(role, "ADMIN") || dataset.uploadedById === userId,
      };
    }),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / DATASETS_PAGE_SIZE)),
  };
});

export type DatasetListItem = Awaited<ReturnType<typeof listDatasets>>["items"][number];

/**
 * Full dataset for the detail page. Throws NotFoundError when the dataset is
 * missing *or* invisible to this user — the two cases are deliberately
 * indistinguishable so IDs can't be probed for existence.
 */
export const getDatasetDetail = cache(async function getDatasetDetail(userId: string, datasetId: string) {
  const dataset = await prisma.dataset.findFirst({
    where: { AND: [{ id: datasetId }, visibleDatasetsWhere(userId)] },
    select: {
      id: true,
      name: true,
      description: true,
      fileType: true,
      fileSize: true,
      rowCount: true,
      columnCount: true,
      schemaJson: true,
      previewJson: true,
      profileJson: true,
      status: true,
      errorMessage: true,
      storagePath: true,
      checksum: true,
      createdAt: true,
      updatedAt: true,
      uploadedById: true,
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          ownerId: true,
          members: { where: { userId }, select: { role: true }, take: 1 },
        },
      },
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
      },
      _count: { select: { versions: true, reports: true, charts: true } },
    },
  });

  if (!dataset) throw new NotFoundError("Dataset not found");

  const { project, ...rest } = dataset;
  const role = effectiveRole(userId, project.ownerId, project.members[0]?.role);

  return {
    ...rest,
    project: { id: project.id, name: project.name, color: project.color },
    role,
    canEdit: satisfiesRole(role, "EDITOR"),
    canDelete: satisfiesRole(role, "ADMIN") || dataset.uploadedById === userId,
  };
});

export type DatasetDetail = Awaited<ReturnType<typeof getDatasetDetail>>;

/**
 * Version history, newest first.
 *
 * Takes a datasetId that the caller has already authorized via
 * `getDatasetDetail` — it is not independently scoped, so never call it with an
 * unvalidated id from a request.
 */
export const getDatasetVersions = cache(async function getDatasetVersions(datasetId: string, take = 50) {
  return prisma.datasetVersion.findMany({
    where: { datasetId },
    orderBy: { version: "desc" },
    take,
    select: {
      id: true,
      version: true,
      label: true,
      rowCount: true,
      storagePath: true,
      createdAt: true,
    },
  });
});

/** Aggregate counts for the datasets list header. */
export const getDatasetStats = cache(async function getDatasetStats(userId: string) {
  const where = visibleDatasetsWhere(userId);

  const [total, ready, processing, errored, aggregate] = await Promise.all([
    prisma.dataset.count({ where }),
    prisma.dataset.count({ where: { AND: [where, { status: "READY" }] } }),
    prisma.dataset.count({ where: { AND: [where, { status: "PROCESSING" }] } }),
    prisma.dataset.count({ where: { AND: [where, { status: "ERROR" }] } }),
    prisma.dataset.aggregate({ where, _sum: { fileSize: true, rowCount: true } }),
  ]);

  return {
    total,
    ready,
    processing,
    errored,
    totalBytes: aggregate._sum.fileSize ?? 0,
    totalRows: aggregate._sum.rowCount ?? 0,
  };
});

/**
 * Finds an existing dataset in the same project with identical content.
 *
 * Duplicate detection is scoped to the project rather than global: the same CSV
 * legitimately belongs in two different projects, and a global check would also
 * leak the existence of files in projects the user cannot see.
 */
export const findDuplicateByChecksum = cache(async function findDuplicateByChecksum(projectId: string, checksum: string) {
  return prisma.dataset.findFirst({
    where: { projectId, checksum },
    select: { id: true, name: true, createdAt: true },
  });
});
