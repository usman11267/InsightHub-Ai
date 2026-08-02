import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

/**
 * Empty state used across every list surface (projects, datasets, reports…).
 * A named component keeps the "nothing here yet" moment consistent and
 * always actionable rather than a dead end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string; icon?: LucideIcon };
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center",
        className
      )}
    >
      <div className="relative mb-4">
        <div
          className="absolute inset-0 rounded-2xl bg-primary/12 blur-xl"
          aria-hidden="true"
        />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <Icon className="size-5 text-primary" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild variant="gradient">
                <a href={action.href}>
                  {ActionIcon && <ActionIcon />}
                  {action.label}
                </a>
              </Button>
            ) : (
              <Button variant="gradient" onClick={action.onClick}>
                {ActionIcon && <ActionIcon />}
                {action.label}
              </Button>
            ))}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
