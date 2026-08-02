import {
  BarChart3,
  Bell,
  Bot,
  Database,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Table2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Single-key shortcut, pressed after `g` (e.g. g→d jumps to Dashboard). */
  shortcut?: string;
};

/**
 * Single source of truth for primary navigation. The sidebar, command palette,
 * and keyboard shortcuts all read from here so they can never drift apart.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "d" },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban, shortcut: "p" },
  { label: "Datasets", href: "/dashboard/datasets", icon: Database, shortcut: "s" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, shortcut: "a" },
  { label: "Forecasting", href: "/dashboard/forecasting", icon: TrendingUp, shortcut: "f" },
  { label: "AI Assistant", href: "/dashboard/assistant", icon: Bot, shortcut: "i" },
  { label: "SQL Workspace", href: "/dashboard/sql", icon: Table2, shortcut: "q" },
  { label: "Reports", href: "/dashboard/reports", icon: FileText, shortcut: "r" },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, shortcut: "n" },
  { label: "Audit Log", href: "/dashboard/audit", icon: ShieldCheck, shortcut: "l" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, shortcut: "," },
];

/**
 * Marks a nav item active. Exact match for the dashboard root, prefix match
 * elsewhere so detail pages keep their section highlighted.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
