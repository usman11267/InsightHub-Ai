"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, NotFoundError } from "@/lib/auth";
import { requireProjectRole } from "@/lib/authorization";
import { logActivity } from "@/lib/activity";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import { ask, buildReportPrompt } from "@/lib/gemini";
import { z } from "zod";
import { createHash } from "crypto";

const generateReportSchema = z.object({
  projectId: z.string().min(1),
  datasetId: z.string().min(1).optional(),
  title: z.string().min(1).max(200).trim(),
  context: z.string().max(1000).optional(),
});

const reportIdSchema = z.object({ id: z.string().min(1) });

export async function generateReport(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`report:generate:${user.id}`, { limit: 10, windowMs: 60_000 });

    const { projectId, datasetId, title, context } = generateReportSchema.parse(input);
    await requireProjectRole(user, projectId, "EDITOR");

    // Create a GENERATING placeholder
    const report = await prisma.report.create({
      data: {
        title,
        projectId,
        datasetId: datasetId || null,
        authorId: user.id,
        status: "GENERATING",
        contentJson: {},
      },
      select: { id: true },
    });

    // Load dataset if provided
    let aiContent = "";
    try {
      if (datasetId) {
        const dataset = await prisma.dataset.findUnique({
          where: { id: datasetId },
          select: { name: true, rowCount: true, schemaJson: true, previewJson: true },
        });

        if (dataset) {
          const prompt = buildReportPrompt({
            datasetName: dataset.name,
            rowCount: dataset.rowCount,
            schema: (dataset.schemaJson as { name: string; inferredType: string }[]) ?? [],
            previewRows: (dataset.previewJson as Record<string, unknown>[]) ?? [],
            additionalContext: context,
          });

          aiContent = await ask(prompt, undefined, undefined, 6000);
        }
      } else {
        aiContent = await ask(
          `Generate a data analysis report titled "${title}". ${context ? `Context: ${context}` : ""}`,
          "You are a professional data analyst. Write a comprehensive report in markdown format.",
          undefined,
          4096
        );
      }

      // Extract a short summary from the first paragraph
      const summaryMatch = aiContent.match(/## Executive Summary\n([\s\S]*?)(?=\n##|$)/);
      const summary = summaryMatch?.[1]?.trim().slice(0, 500) ?? aiContent.slice(0, 300);

      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "READY",
          summary,
          contentJson: { markdown: aiContent },
        },
      });
    } catch (aiErr) {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "ERROR",
          contentJson: { error: String(aiErr) },
        },
      });
    }

    await logActivity({
      actorId: user.id,
      action: "REPORT_GENERATED",
      projectId,
      metadata: { entityName: title, reportId: report.id },
    });

    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard");
    return { success: true, data: { id: report.id } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteReport(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`report:delete:${user.id}`, { limit: 20, windowMs: 60_000 });

    const { id } = reportIdSchema.parse(input);
    const report = await prisma.report.findUnique({
      where: { id },
      select: { authorId: true, projectId: true, title: true },
    });
    if (!report) throw new NotFoundError("Report not found");

    await requireProjectRole(user, report.projectId, "VIEWER");
    if (report.authorId !== user.id) {
      await requireProjectRole(user, report.projectId, "ADMIN");
    }

    await prisma.report.delete({ where: { id } });

    await logActivity({
      actorId: user.id,
      action: "REPORT_DELETED",
      projectId: report.projectId,
      metadata: { entityName: report.title },
    });

    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleShareLink(input: unknown): Promise<ActionResult<{ shareSlug: string | null }>> {
  try {
    const user = await requireUser();

    const { id } = reportIdSchema.parse(input);
    const report = await prisma.report.findUnique({
      where: { id },
      select: { authorId: true, projectId: true, shareSlug: true },
    });
    if (!report) throw new NotFoundError("Report not found");
    await requireProjectRole(user, report.projectId, "EDITOR");

    const newSlug = report.shareSlug
      ? null
      : createHash("sha256")
          .update(`${id}${Date.now()}`)
          .digest("hex")
          .slice(0, 16);

    await prisma.report.update({ where: { id }, data: { shareSlug: newSlug } });

    revalidatePath(`/dashboard/reports/${id}`);
    return { success: true, data: { shareSlug: newSlug } };
  } catch (error) {
    return actionError(error);
  }
}
