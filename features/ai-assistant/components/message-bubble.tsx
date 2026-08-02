"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/features/ai-assistant/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

/** Very lightweight Markdown-to-HTML renderer for chat messages. */
function renderMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="my-2 overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs font-mono"><code>${escapeHtml(code.trim())}</code></pre>`
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italics
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="mt-3 mb-1 text-sm font-semibold">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-4 mb-1 text-base font-semibold">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-4 mb-1 text-lg font-semibold">$1</h1>')
    // Bullet lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-2 space-y-0.5">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    // Paragraphs — double newlines
    .replace(/\n\n/g, '</p><p class="mt-2">')
    // Single newlines
    .replace(/\n/g, "<br/>");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "gradient-brand text-white"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-card border border-border"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : message.content ? (
          <div
            className="prose-sm leading-relaxed [&_ul]:my-1 [&_li]:my-0.5"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        ) : null}

        {/* Streaming cursor */}
        {isStreaming && message.content && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-current opacity-70" />
        )}
      </div>
    </motion.div>
  );
}
