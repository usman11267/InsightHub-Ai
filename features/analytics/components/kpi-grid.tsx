"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { KPI } from "@/features/analytics/compute";

interface KpiGridProps {
  kpis: KPI[];
}

const ACCENT_STYLES = {
  primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  success: { bg: "bg-success/10", text: "text-success-on-surface", border: "border-success/20" },
  warning: { bg: "bg-warning/10", text: "text-warning-on-surface", border: "border-warning/20" },
  info: { bg: "bg-info/10", text: "text-info-on-surface", border: "border-info/20" },
};

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const accent = ACCENT_STYLES[kpi.accent];
        const TrendIcon =
          kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;

        return (
          <Card key={kpi.label} className={cn("border p-5", accent.border)}>
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className={cn("mt-2 text-3xl font-bold tabular-nums tracking-tight", accent.text)}>
              {kpi.value}
            </p>
            {(kpi.subLabel || kpi.trend) && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                {kpi.trend && (
                  <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium", accent.bg, accent.text)}>
                    <TrendIcon className="size-3" />
                    {kpi.trend}
                  </span>
                )}
                {kpi.subLabel && <span>{kpi.subLabel}</span>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
