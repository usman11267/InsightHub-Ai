import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { visibleProjectsWhere } from "@/features/dashboard/queries";

export const listReports = cache(async function listReports(userId: string, page = 1, pageSize = 12) {
  const skip = (page - 1) * pageSize;
  const where = {
    project: visibleProjectsWhere(userId),
  };

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        shareSlug: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true, color: true } },
        dataset: { select: { id: true, name: true } },
        author: { select: { firstName: true, lastName: true, email: true, imageUrl: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
);

export const getReportDetail = cache(async function getReportDetail(userId: string, reportId: string) {
  return prisma.report.findFirst({
    where: {
      id: reportId,
      project: visibleProjectsWhere(userId),
    },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      contentJson: true,
      shareSlug: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      dataset: { select: { id: true, name: true } },
      author: { select: { firstName: true, lastName: true, email: true, imageUrl: true } },
    },
  });
}
);

/**
 * Public lookup for the shared-report route (`/r/[slug]`). No auth filter on
 * purpose: the share slug is the capability — knowing it means being allowed
 * to read the report. Only READY reports are shareable.
 */
export const getReportByShareSlug = cache(async function getReportByShareSlug(slug: string) {
  return prisma.report.findFirst({
    where: { shareSlug: slug },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      contentJson: true,
      createdAt: true,
      project: { select: { id: true, name: true, color: true } },
      dataset: { select: { id: true, name: true } },
      author: { select: { firstName: true, lastName: true } },
    },
  });
}
);
