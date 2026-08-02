"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { requireProjectRole } from "@/lib/authorization";
import { logActivity } from "@/lib/activity";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import { ask, buildSQLExplainPrompt } from "@/lib/gemini";
import { z } from "zod";

const saveQuerySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(120).trim(),
  sql: z.string().min(1).max(10_000),
  description: z.string().max(500).optional(),
});

const queryIdSchema = z.object({ id: z.string().min(1) });

export async function saveQuery(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`sql:save:${user.id}`, { limit: 30, windowMs: 60_000 });

    const data = saveQuerySchema.parse(input);
    await requireProjectRole(user, data.projectId, "EDITOR");

    const query = await prisma.savedQuery.create({
      data: { ...data, description: data.description ?? null, authorId: user.id },
      select: { id: true },
    });

    await logActivity({
      actorId: user.id,
      action: "QUERY_SAVED",
      projectId: data.projectId,
      metadata: { entityName: data.name },
    });

    revalidatePath("/dashboard/sql");
    return { success: true, data: { id: query.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteQuery(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const { id } = queryIdSchema.parse(input);

    const query = await prisma.savedQuery.findUnique({
      where: { id },
      select: { authorId: true, projectId: true, name: true },
    });
    if (!query) throw new Error("Query not found");
    if (query.authorId !== user.id) {
      await requireProjectRole(user, query.projectId, "ADMIN");
    }

    await prisma.savedQuery.delete({ where: { id } });
    revalidatePath("/dashboard/sql");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function explainSQL(sql: string): Promise<ActionResult<{ explanation: string }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`sql:explain:${user.id}`, { limit: 20, windowMs: 60_000 });

    const explanation = await ask(buildSQLExplainPrompt(sql), undefined, undefined, 1024);
    return { success: true, data: { explanation } };
  } catch (error) {
    return actionError(error);
  }
}
