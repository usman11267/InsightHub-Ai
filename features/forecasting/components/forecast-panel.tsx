"use client";

import * as React from "react";
import { useState } from "react";
import { Loader2, Sparkles, TrendingUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { useRouter } from "next/navigation";

type Dataset = {
  id: string;
  name: string;
  fileType: string;
  rowCount: number;
  schemaJson: unknown;
  previewJson: unknown;
};

interface ForecastPanelProps {
  datasets: Dataset[];
  selectedDataset: Dataset;
}

type ForecastResult = {
  summary: string;
  trend: "up" | "down" | "stable";
  confidence: number;
  growthRate: number | null;
  forecastPoints: { label: string; value: number; isForecast: boolean }[];
};

export function ForecastPanel({ datasets, selectedDataset }: ForecastPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState("");
  const [periods, setPeriods] = useState(3);

  function handleDatasetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/dashboard/forecasting?datasetId=${e.target.value}`);
  }

  async function handleForecast() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetId: selectedDataset.id,
          periods,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Forecast failed");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const TREND_COLORS = {
    up: "text-success-on-surface",
    down: "text-destructive-on-surface",
    stable: "text-info-on-surface",
  };
  const TREND_LABELS = { up: "↑ Upward trend", down: "↓ Downward trend", stable: "→ Stable" };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-5">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-sm font-medium">Dataset</label>
            <select
              value={selectedDataset.id}
              onChange={handleDatasetChange}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="mb-1.5 block text-sm font-medium">Forecast periods</label>
            <select
              value={periods}
              onChange={(e) => setPeriods(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {[1, 2, 3, 5, 7, 10, 12].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <Button variant="gradient" onClick={handleForecast} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate forecast
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive-on-surface">{error}</p>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Forecast Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-xl bg-muted/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Trend</p>
                  <p className={`text-lg font-bold ${TREND_COLORS[result.trend]}`}>
                    {TREND_LABELS[result.trend]}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="text-lg font-bold">{result.confidence}%</p>
                </div>
                {result.growthRate !== null && (
                  <div className="rounded-xl bg-muted/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Estimated growth</p>
                    <p className={`text-lg font-bold ${result.growthRate >= 0 ? "text-success-on-surface" : "text-destructive-on-surface"}`}>
                      {result.growthRate >= 0 ? "+" : ""}{result.growthRate.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {result.summary}
              </p>
            </CardContent>
          </Card>

          {/* Chart */}
          {result.forecastPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Trend + Forecast Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={result.forecastPoints} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fcast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 10,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-popover)",
                        color: "var(--color-popover-foreground)",
                        boxShadow: "var(--shadow-popover)",
                        padding: "8px 10px",
                      }}
                      cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                    />
                    {/* Separator line between historical and forecast */}
                    {result.forecastPoints.find((p) => p.isForecast) && (
                      <ReferenceLine
                        x={result.forecastPoints.find((p) => p.isForecast)?.label}
                        stroke="var(--color-warning)"
                        strokeDasharray="4 4"
                        label={{ value: "Forecast →", fontSize: 10, fill: "var(--color-warning-on-surface)" }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-chart-1)"
                      fill="url(#fcast)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial state */}
      {!result && !loading && !error && (
        <Card className="p-8 text-center">
          <Bot className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Ready to forecast</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select a dataset above and click &quot;Generate forecast&quot; to get AI-powered trend analysis and predictions.
          </p>
        </Card>
      )}
    </div>
  );
}
