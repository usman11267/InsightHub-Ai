"use client";

import * as React from "react";

type SidebarState = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Command palette visibility — shared so the topbar search can open it. */
  commandOpen: boolean;
  setCommandOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = React.createContext<SidebarState | null>(null);

const STORAGE_KEY = "insighthub:sidebar-collapsed";

/**
 * The collapsed preference lives in localStorage, which is an external store —
 * so it's read through useSyncExternalStore rather than synced into state with
 * an effect. The server snapshot is always `false`, so SSR markup matches and
 * React reconciles the persisted value during hydration in a single pass.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Cross-tab: another tab toggling the sidebar should update this one.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

function setCollapsedPreference(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [commandOpen, setCommandOpen] = React.useState(false);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsedPreference(!getSnapshot());
  }, []);

  const value = React.useMemo(
    () => ({ collapsed, toggleCollapsed, commandOpen, setCommandOpen }),
    [collapsed, toggleCollapsed, commandOpen]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarState {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
