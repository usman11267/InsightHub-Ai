import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * Dashboard metric tile. The value is the loudest element; the label and
 * delta stay quiet so a row of these scans as data, not decoration.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  accent = "primary",
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Percent change vs. the previous period. Positive renders as an uptick. */
  delta?: number | null;
  hint?: string;
  accent?: "primary" | "info" | "success" | "warning";
  className?: string;
}) {
  const accents = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info-on-surface",
    success: "bg-success/10 text-success-on-surface",
    warning: "bg-warning/12 text-warning-on-surface",
  };

  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && delta >= 0;
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <Card interactive className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accents[accent]
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>

      {(hasDelta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums",
                isUp ? "bg-success/12 text-success-on-surface" : "bg-destructive/12 text-destructive-on-surface"
              )}
            >
              <DeltaIcon className="size-3" />
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
