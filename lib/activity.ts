import "server-only";
import { prisma } from "@/lib/prisma";
import type { ActivityAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** Append an audit/activity entry. Failures never break the caller. */
export async function logActivity(input: {
  actorId: string;
  action: ActivityAction;
  projectId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        projectId: input.projectId ?? null,
        metadata: input.metadata ?? {},
      },
    });
  } catch (err) {
    // Audit logging must never break the main flow.
    console.error("[activity] failed to log:", err);
  }
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({ data: input });
  } catch (err) {
    console.error("[notification] failed to create:", err);
  }
}
