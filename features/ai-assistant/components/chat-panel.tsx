"use client";

import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Send, Bot, StopCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { QUICK_PROMPTS, type ChatMessage, type ChatContext } from "@/features/ai-assistant/types";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ChatPanelProps {
  context?: ChatContext;
}

export function ChatPanel({ context }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function sendMessage(userText: string) {
    if (!userText.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: userText.trim(),
      createdAt: new Date(),
    };

    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    scrollToBottom();

    abortRef.current = new AbortController();

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          datasetId: context?.datasetId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${err}` } : m
          )
        );
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
        scrollToBottom();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      setTimeout(scrollToBottom, 100);
    }
  }

  function stopStream() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl gradient-brand shadow-lg">
                <Bot className="size-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">InsightHub AI</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                  {context?.datasetName
                    ? `Analyzing "${context.datasetName}". Ask me anything about this data.`
                    : "Ask me anything about data analysis, charts, SQL, or statistics."}
                </p>
              </div>

              {/* Quick prompts */}
              <div className="grid gap-2 sm:grid-cols-2 w-full max-w-lg">
                {QUICK_PROMPTS.slice(0, 6).map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  >
                    <span className="text-base">{qp.icon}</span>
                    <span className="font-medium text-xs">{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === "assistant"} />
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
        {!isEmpty && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {QUICK_PROMPTS.slice(0, 4).map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={isStreaming}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <span>{qp.icon}</span>
                {qp.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative flex-1 rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your data…"
              disabled={isStreaming}
              rows={1}
              className="w-full resize-none bg-transparent px-3 py-2.5 pr-10 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              style={{ minHeight: 40, maxHeight: 160 }}
            />
            {input && !isStreaming && (
              <div className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground">
                ↵ send
              </div>
            )}
          </div>

          {isStreaming ? (
            <Button variant="outline" size="icon" onClick={stopStream} className="shrink-0">
              <StopCircle className="size-4 text-destructive" />
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="icon"
              disabled={!input.trim()}
              onClick={() => sendMessage(input)}
              className="shrink-0"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3" />
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
