import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/** Thrown when a signed-out user hits an authenticated path. */
export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Thrown when a signed-in user lacks the required role on a resource. */
export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Thrown when a resource doesn't exist, or is hidden from this user. */
export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Resolve the current DB user from the Clerk session.
 * Cached per request (React.cache) so layouts/pages/actions share one lookup.
 * Returns null when signed out. Creates the DB row on first authenticated
 * request as a fallback to the Clerk webhook.
 */
export const getCurrentDbUser = cache(async () => {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // Fallback sync — the webhook normally does this first.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkId}@unknown.local`;

  return prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      firstName: clerkUser.firstName ?? undefined,
      lastName: clerkUser.lastName ?? undefined,
      imageUrl: clerkUser.imageUrl ?? undefined,
    },
    create: {
      clerkId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
  });
});

/** Like getCurrentDbUser but throws when unauthenticated — for Server Actions. */
export async function requireUser() {
  const user = await getCurrentDbUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/** Format helpers shared across the app. */
export function userDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

export function userInitials(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const first = user.firstName?.[0];
  const last = user.lastName?.[0];
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}
