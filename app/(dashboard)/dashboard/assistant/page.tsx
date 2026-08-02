import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/features/ai-assistant/components/chat-panel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { isAIConfigured } from "@/lib/gemini";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Chat with your data using natural language powered by Groq.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function AssistantPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const datasetId = sp.datasetId;

  // Load dataset context if provided
  let datasetContext: { id: string; name: string } | null = null;
  if (datasetId) {
    const ds = await prisma.dataset.findFirst({
      where: {
        id: datasetId,
        project: {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
        status: "READY",
      },
      select: { id: true, name: true },
    });
    datasetContext = ds;
  }

  // Recent datasets the user can chat about
  const recentDatasets = await prisma.dataset.findMany({
    where: {
      status: "READY",
      project: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, fileType: true, rowCount: true },
  });

  const aiConfigured = isAIConfigured();

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-6">
      {/* Sidebar — dataset picker */}
      <div className="hidden w-64 shrink-0 flex-col gap-3 lg:flex">
        <div>
          <h2 className="text-sm font-semibold">Context</h2>
          <p className="text-xs text-muted-foreground">Select a dataset to analyze</p>
        </div>

        <div className="space-y-1.5">
          <Link
            href="/dashboard/assistant"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              !datasetId ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
            }`}
          >
            <Bot className="size-4" />
            No context
          </Link>

          {recentDatasets.map((ds: any) => (
            <Link
              key={ds.id}
              href={`/dashboard/assistant?datasetId=${ds.id}`}
              className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                ds.id === datasetId ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Database className="size-3.5 shrink-0" />
                <span className="truncate">{ds.name}</span>
              </span>
              <span className="ml-6 text-xs text-muted-foreground">
                {ds.rowCount.toLocaleString()} rows · {ds.fileType}
              </span>
            </Link>
          ))}
        </div>

        {!aiConfigured && (
          <Card className="mt-auto p-3 border-warning/30 bg-warning/5">
            <p className="text-xs text-warning font-medium">⚠️ GROQ_API_KEY not set</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your key to .env to enable AI features.
            </p>
          </Card>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg gradient-brand">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">InsightHub AI</p>
              {datasetContext ? (
                <p className="text-xs text-muted-foreground">Analyzing: {datasetContext.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">General assistant</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Groq · Llama 3.1
          </Badge>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            context={
              datasetContext
                ? { datasetId: datasetContext.id, datasetName: datasetContext.name }
                : undefined
            }
          />
        </div>
      </Card>
    </div>
  );
}
