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
  let clerkId: string | null = null;
  try {
    const session = await auth();
    clerkId = session.userId;
  } catch {
    clerkId = null;
  }
  if (!clerkId) return null;

  try {
    const existing = await prisma.user.findUnique({ where: { clerkId } });
    if (existing) return existing;
  } catch (err) {
    console.error("[getCurrentDbUser] findUnique error:", err);
  }

  // Fallback sync — the webhook normally does this first.
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch {
    clerkUser = null;
  }

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    `${clerkId}@user.clerk`;

  const firstName = clerkUser?.firstName ?? "User";
  const lastName = clerkUser?.lastName ?? "";
  const imageUrl = clerkUser?.imageUrl ?? null;

  try {
    return await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        imageUrl: imageUrl || undefined,
      },
      create: {
        clerkId,
        email,
        firstName,
        lastName,
        imageUrl,
      },
    });
  } catch {
    try {
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        return await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            imageUrl: imageUrl || undefined,
          },
        });
      }
    } catch {
      // Ignore DB errors during email match fallback
    }

    // Final in-memory fallback user if Database is unreachable (P1001)
    return {
      id: clerkId,
      clerkId,
      email,
      firstName,
      lastName,
      imageUrl,
      onboardingDone: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
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
