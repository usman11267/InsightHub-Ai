"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertRateLimited, actionError, type ActionResult } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().max(50).trim().optional(),
  lastName: z.string().max(50).trim().optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(80).trim(),
});

const revokeApiKeySchema = z.object({ id: z.string().min(1) });

export async function updateProfile(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();
    assertRateLimited(`settings:profile:${user.id}`, { limit: 20, windowMs: 60_000 });

    const data = updateProfileSchema.parse(input);
    await prisma.user.update({ where: { id: user.id }, data });

    await logActivity({ actorId: user.id, action: "SETTINGS_UPDATED", metadata: { section: "profile" } });
    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

export async function createApiKey(
  input: unknown
): Promise<ActionResult<{ key: string; id: string; name: string; prefix: string; createdAt: Date }>> {
  try {
    const user = await requireUser();
    assertRateLimited(`settings:apikey:${user.id}`, { limit: 10, windowMs: 60_000 });

    const { name } = createApiKeySchema.parse(input);

    const raw = `ihk_live_${randomBytes(32).toString("hex")}`;
    const prefix = raw.slice(0, 20) + "…";
    const hashedKey = createHash("sha256").update(raw).digest("hex");

    const key = await prisma.apiKey.create({
      data: { name, prefix, hashedKey, userId: user.id },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });

    await logActivity({ actorId: user.id, action: "API_KEY_CREATED", metadata: { name } });
    revalidatePath("/dashboard/settings");

    // Return the plaintext key ONCE — it is never stored
    return { success: true, data: { ...key, key: raw } };
  } catch (error) {
    return actionError(error);
  }
}

export async function revokeApiKey(input: unknown): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser();

    const { id } = revokeApiKeySchema.parse(input);
    await prisma.apiKey.updateMany({
      where: { id, userId: user.id },
      data: { revokedAt: new Date() },
    });

    await logActivity({ actorId: user.id, action: "API_KEY_REVOKED", metadata: { id } });
    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
