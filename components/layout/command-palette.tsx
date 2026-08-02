"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useTheme } from "next-themes";
import { Moon, Plus, Search, Sun, Upload } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Global command palette (⌘K / Ctrl+K).
 *
 * Also owns the `g`-prefixed jump shortcuts (g→d for Dashboard, etc.) since
 * both need the same NAV_ITEMS list and the same "am I typing in a field?" guard.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { commandOpen: open, setCommandOpen: setOpen } = useSidebar();
  const [search, setSearch] = React.useState("");

  // Tracks whether `g` was the previous keypress, for two-stroke navigation.
  const goModeRef = React.useRef(false);

  React.useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      // ⌘K works everywhere, including inside inputs.
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Single-key shortcuts must never fire while the user is typing.
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (goModeRef.current) {
        const match = NAV_ITEMS.find((item) => item.shortcut === e.key.toLowerCase());
        goModeRef.current = false;
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        goModeRef.current = true;
        // Lapse the prefix so a stray `g` doesn't hijack the next keypress.
        window.setTimeout(() => {
          goModeRef.current = false;
        }, 1500);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, setOpen]);

  const run = React.useCallback(
    (action: () => void) => {
      setOpen(false);
      setSearch("");
      action();
    },
    [setOpen]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="overflow-hidden p-0 shadow-[var(--shadow-popover)]"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        <Command
          shouldFilter
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search or jump to…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{search}&rdquo;
            </Command.Empty>

            <Command.Group heading="Navigation">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => run(() => router.push(item.href))}
                    className={itemClass}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="ml-auto flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
                        <kbd className="rounded border border-border px-1">g</kbd>
                        <kbd className="rounded border border-border px-1">{item.shortcut}</kbd>
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item
                value="New project create"
                onSelect={() => run(() => router.push("/dashboard/projects?new=1"))}
                className={itemClass}
              >
                <Plus className="size-4 text-muted-foreground" />
                New project
              </Command.Item>
              <Command.Item
                value="Upload dataset"
                onSelect={() => run(() => router.push("/dashboard/datasets?upload=1"))}
                className={itemClass}
              >
                <Upload className="size-4 text-muted-foreground" />
                Upload dataset
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Theme">
              <Command.Item
                value="Light theme"
                onSelect={() => run(() => setTheme("light"))}
                className={itemClass}
              >
                <Sun className="size-4 text-muted-foreground" />
                Light mode
              </Command.Item>
              <Command.Item
                value="Dark theme"
                onSelect={() => run(() => setTheme("dark"))}
                className={itemClass}
              >
                <Moon className="size-4 text-muted-foreground" />
                Dark mode
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const itemClass = cn(
  "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none",
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
);
