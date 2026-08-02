import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Data access for the dashboard overview.
 *
 * Kept out of the page component so the queries are testable and the page
 * stays a thin rendering layer.
 */

/** Projects the user owns or is a member of. */
export function visibleProjectsWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

export type DashboardStats = {
  projectCount: number;
  datasetCount: number;
  reportCount: number;
  fileCount: number;
  storageBytes: number;
  /** Percent change in datasets vs. the previous 30-day window. */
  datasetTrend: number | null;
};

export const getDashboardStats = cache(async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    const projectScope = { project: visibleProjectsWhere(userId) };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

    const [projectCount, datasetCount, reportCount, storage, recentCount, priorCount] =
      await Promise.all([
        prisma.project.count({ where: visibleProjectsWhere(userId) }),
        prisma.dataset.count({ where: projectScope }),
        prisma.report.count({ where: projectScope }),
        prisma.dataset.aggregate({
          where: projectScope,
          _sum: { fileSize: true },
          _count: { _all: true },
        }),
        prisma.dataset.count({
          where: { ...projectScope, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.dataset.count({
          where: { ...projectScope, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        }),
      ]);

    const datasetTrend =
      priorCount === 0 ? null : ((recentCount - priorCount) / priorCount) * 100;

    return {
      projectCount,
      datasetCount,
      reportCount,
      fileCount: storage._count._all,
      storageBytes: storage._sum.fileSize ?? 0,
      datasetTrend,
    };
  } catch {
    return {
      projectCount: 0,
      datasetCount: 0,
      reportCount: 0,
      fileCount: 0,
      storageBytes: 0,
      datasetTrend: null,
    };
  }
});

export const getRecentActivity = cache(async function getRecentActivity(userId: string, take = 8) {
  try {
    return await prisma.activityLog.findMany({
      where: {
        OR: [{ actorId: userId }, { project: visibleProjectsWhere(userId) }],
      },
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
  } catch {
    return [];
  }
});

export const getRecentReports = cache(async function getRecentReports(userId: string, take = 5) {
  try {
    return await prisma.report.findMany({
      where: { project: visibleProjectsWhere(userId) },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });
  } catch {
    return [];
  }
});

export const getRecentProjects = cache(async function getRecentProjects(userId: string, take = 4) {
  try {
    return await prisma.project.findMany({
      where: visibleProjectsWhere(userId),
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        tags: true,
        updatedAt: true,
        _count: { select: { datasets: true, reports: true, members: true } },
      },
    });
  } catch {
    return [];
  }
});
