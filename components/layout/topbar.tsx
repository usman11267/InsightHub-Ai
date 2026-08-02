"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Menu, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useSidebar } from "@/components/layout/sidebar-context";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Topbar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const { setCommandOpen } = useSidebar();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the mobile drawer on navigation — otherwise it covers the new page.
  // Adjusted during render rather than in an effect: React discards this pass
  // and re-renders immediately, so the drawer never paints over the new route.
  const [lastPathname, setLastPathname] = React.useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 lg:px-6">
      {/* Mobile nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center gap-2 border-b border-border px-4">
            <div className="flex size-8 items-center justify-center rounded-lg gradient-brand">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">InsightHub AI</span>
          </div>
          <nav className="space-y-0.5 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Search — opens the command palette rather than being a real input,
          so there's one search surface instead of two. */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/50 sm:max-w-sm"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search projects, datasets…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Link href="/dashboard/notifications">
            <Bell />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 size-4 justify-center p-0 text-[10px] tabular-nums"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Link>
        </Button>

        <ThemeToggle />

        <div className="ml-1">
          <UserButton
            appearance={{ elements: { avatarBox: "size-8 rounded-full" } }}
            userProfileMode="navigation"
            userProfileUrl="/dashboard/settings"
          />
        </div>
      </div>
    </header>
  );
}
