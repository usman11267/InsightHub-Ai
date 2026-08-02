"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronsLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar z-40 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-4 border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-sidebar-hover">
            <Image src="/logo.png" alt="InsightHub Logo" width={32} height={32} className="object-cover" />
          </div>
          {!collapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-title">
              InsightHub AI
            </span>
          )}
        </Link>
      </div>

      {/* Primary action */}
      <div className="px-3 pt-4 pb-2">
        {collapsed ? (
          <SimpleTooltip label="New project" side="right">
            <Button asChild variant="default" size="icon" className="w-full">
              <Link href="/dashboard/projects?new=1" aria-label="New project">
                <Plus className="size-4" />
              </Link>
            </Button>
          </SimpleTooltip>
        ) : (
          <Button asChild variant="default" className="w-full shadow-sm shadow-primary/25">
            <Link href="/dashboard/projects?new=1">
              <Plus className="size-4" />
              New project
            </Link>
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item.href, pathname);
          const Icon = item.icon;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-active text-white shadow-sm shadow-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-title"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-white" : "text-sidebar-foreground group-hover:text-sidebar-title"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          return collapsed ? (
            <SimpleTooltip key={item.href} label={item.label} side="right">
              {link}
            </SimpleTooltip>
          ) : (
            link
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={toggleCollapsed}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-title",
            collapsed ? "w-full" : "w-full justify-start"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </aside>
  );
}
