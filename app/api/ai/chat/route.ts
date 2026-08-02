import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/auth";
import { streamChat, buildDatasetSystemPrompt, type ChatMessage, GROQ_MODEL_FAST } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/chat
 * Body: { messages: ChatMessage[], datasetId?: string }
 *
 * Streams a Groq LLM response back as newline-delimited text chunks.
 * Dataset context (schema + preview rows) is injected as the system prompt.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getCurrentDbUser();
  if (!user) return new Response("User not found", { status: 401 });

  // Rate limit: 60 messages/min per user
  const rl = rateLimit(`ai:chat:${user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(`Rate limited. Retry in ${rl.retryAfterSeconds}s.`, { status: 429 });
  }

  let body: { messages: ChatMessage[]; datasetId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { messages, datasetId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages array is required", { status: 400 });
  }

  // Build final messages array with optional dataset system prompt
  const finalMessages: ChatMessage[] = [];

  if (datasetId) {
    // Verify access — dataset must belong to a project the user can see
    const dataset = await prisma.dataset.findFirst({
      where: {
        id: datasetId,
        project: {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      },
      select: {
        name: true,
        rowCount: true,
        columnCount: true,
        schemaJson: true,
        previewJson: true,
      },
    });

    if (dataset) {
      const systemPrompt = buildDatasetSystemPrompt({
        datasetName: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        schema: (dataset.schemaJson as { name: string; inferredType: string; missingCount: number; uniqueCount: number }[]) ?? [],
        previewRows: (dataset.previewJson as Record<string, unknown>[]) ?? [],
      });
      finalMessages.push({ role: "system", content: systemPrompt });
    }
  } else {
    // Generic assistant without dataset context
    finalMessages.push({
      role: "system",
      content:
        "You are InsightHub AI, an expert data analyst assistant. Help users analyze data, interpret charts, write SQL, and understand statistical concepts. Be concise and precise.",
    });
  }

  // Append conversation history (skip any system messages from client)
  for (const msg of messages) {
    if (msg.role !== "system") {
      finalMessages.push(msg);
    }
  }

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(finalMessages, GROQ_MODEL_FAST, 2048)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
