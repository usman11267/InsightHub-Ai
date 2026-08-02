"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/rate-limit";
import { z } from "zod";

const notifIdSchema = z.object({ id: z.string().min(1) });

export async function markNotificationRead(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const { id } = notifIdSchema.parse(input);
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteNotification(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    const { id } = notifIdSchema.parse(input);
    await prisma.notification.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/notifications");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
