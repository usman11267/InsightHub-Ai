"use client";

import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Next.js remounts this on any uncaught render error
 * in the segment tree below it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Replace with your error reporter (Sentry, etc.) in production.
    console.error("[InsightHub] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <AlertTriangle className="size-5 text-warning" />
      </div>

      <h1 className="mt-5 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We hit an unexpected error while rendering this page. Your data is safe — retrying
        usually resolves it.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-6 flex items-center gap-2">
        <Button onClick={reset} variant="gradient">
          <RotateCw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Back to dashboard</a>
        </Button>
      </div>
    </div>
  );
}
