import "server-only";
import { prisma } from "@/lib/prisma";
import { visibleProjectsWhere } from "@/features/dashboard/queries";

export async function listSavedQueries(userId: string, projectId?: string) {
  return prisma.savedQuery.findMany({
    where: {
      project: visibleProjectsWhere(userId),
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true, name: true, sql: true, description: true, createdAt: true, updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      author: { select: { firstName: true, lastName: true, email: true } },
    },
  });
}
