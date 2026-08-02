import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { logActivity, notifyUser } from "@/lib/activity";

/**
 * Clerk → Postgres user sync.
 *
 * The signature check is the only thing standing between this endpoint and
 * anyone on the internet writing to the users table, so an unset secret is a
 * hard failure rather than a skipped verification.
 */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Signature is computed over the raw body — parse only after verifying.
  const body = await req.text();

  let event: WebhookEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url, primary_email_address_id } =
          event.data;

        const primary = email_addresses.find((e) => e.id === primary_email_address_id);
        const email = primary?.email_address ?? email_addresses[0]?.email_address;

        if (!email) {
          console.warn(`[clerk-webhook] user ${id} has no email address; skipping`);
          break;
        }

        let user;
        try {
          user = await prisma.user.upsert({
            where: { clerkId: id },
            update: {
              email,
              firstName: first_name,
              lastName: last_name,
              imageUrl: image_url,
            },
            create: {
              clerkId: id,
              email,
              firstName: first_name,
              lastName: last_name,
              imageUrl: image_url,
            },
          });
        } catch {
          const existingByEmail = await prisma.user.findUnique({ where: { email } });
          if (existingByEmail) {
            user = await prisma.user.update({
              where: { id: existingByEmail.id },
              data: {
                clerkId: id,
                firstName: first_name ?? undefined,
                lastName: last_name ?? undefined,
                imageUrl: image_url ?? undefined,
              },
            });
          } else {
            throw new Error("Failed to sync user via webhook");
          }
        }

        if (event.type === "user.created") {
          await Promise.all([
            logActivity({
              actorId: user.id,
              action: "USER_SIGNED_UP",
              metadata: { email },
            }),
            notifyUser({
              userId: user.id,
              title: "Welcome to InsightHub AI",
              body: "Create your first project to start analyzing data.",
              href: "/dashboard/projects",
            }),
          ]);
        }
        break;
      }

      case "user.deleted": {
        // Clerk sends deleted:true events without an id for some object types.
        if (!event.data.id) break;
        // Cascades to projects, datasets, reports — see schema onDelete rules.
        await prisma.user.deleteMany({ where: { clerkId: event.data.id } });
        break;
      }

      default:
        // Unhandled event types are acknowledged so Clerk stops retrying.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[clerk-webhook] failed handling ${event.type}:`, err);
    // 500 tells Clerk to retry with backoff — the upserts are idempotent.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
