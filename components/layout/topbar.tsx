"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { Bell, Menu, Search } from "lucide-react";
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
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-x-0 border-t-0 border-b border-border px-4 lg:px-6">
      {/* Mobile nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
            <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden">
              <Image src="/logo-mark.png" alt="InsightHub AI Logo" width={32} height={32} className="size-7 object-contain" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-title">InsightHub AI</span>
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
                      ? "bg-sidebar-active text-white"
                      : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-title"
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

      {/* Search — opens the command palette rather than being a real input */}
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="flex h-9.5 flex-1 items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:max-w-md"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">Search projects, datasets, reports…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
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
