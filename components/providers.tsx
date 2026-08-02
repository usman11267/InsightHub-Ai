"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client-side provider stack. Kept in one component so the root layout
 * stays a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // useState (not a module-level const) so each SSR request gets its own
  // cache and users never share query data.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry auth/permission failures — they won't fix themselves.
              const message = error instanceof Error ? error.message : "";
              if (/unauthorized|forbidden|not found/i.test(message)) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300} skipDelayDuration={200}>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-[var(--shadow-popover)]",
              },
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
