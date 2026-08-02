"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Activity,
  Maximize2,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" } as const;
const AXIS_LINE = { stroke: "var(--color-border)" } as const;

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  boxShadow: "var(--shadow-popover)",
  padding: "8px 10px",
} as const;

const TOOLTIP_CURSOR = { fill: "var(--color-muted)", opacity: 0.5 } as const;

type Row = Record<string, unknown>;

type ChartTypeMode = "BAR" | "LINE" | "AREA" | "PIE" | "DONUT" | "RADAR" | "SCATTER" | "HISTOGRAM" | "COMPOSED";

interface AnalyticsChartsProps {
  rows: Row[];
  schema: { name: string; inferredType: string }[];
}

export function AnalyticsCharts({ rows, schema }: AnalyticsChartsProps) {
  const numCols = useMemo(() => schema.filter((c) => c.inferredType === "number").map((c) => c.name), [schema]);
  const strCols = useMemo(() => schema.filter((c) => c.inferredType === "string" || c.inferredType === "boolean").map((c) => c.name), [schema]);
  const dateCols = useMemo(() => schema.filter((c) => c.inferredType === "date").map((c) => c.name), [schema]);

  const [selectedChartType, setSelectedChartType] = useState<ChartTypeMode>("BAR");
  const [selectedX, setSelectedX] = useState<string>(strCols[0] ?? dateCols[0] ?? schema[0]?.name ?? "");
  const [selectedY, setSelectedY] = useState<string>(numCols[0] ?? schema[1]?.name ?? "");
  const [secondaryY, setSecondaryY] = useState<string>(numCols[1] ?? "");
  const [viewMode, setViewMode] = useState<"auto" | "custom">("auto");

  // Prepare custom chart data based on selected X and Y columns
  const customData = useMemo(() => {
    if (!rows.length || !selectedX || !selectedY) return [];

    if (selectedChartType === "HISTOGRAM") {
      // Create frequency distribution buckets for numeric Y
      const vals = rows.map((r) => Number(r[selectedY])).filter((v) => !isNaN(v));
      if (!vals.length) return [];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const bucketCount = 8;
      const step = (max - min) / bucketCount || 1;

      const buckets = Array.from({ length: bucketCount }, (_, i) => {
        const start = min + i * step;
        const end = start + step;
        const count = vals.filter((v) => v >= start && (i === bucketCount - 1 ? v <= end : v < end)).length;
        const rangeStr = `${start.toFixed(1)} - ${end.toFixed(1)}`;
        return {
          x: rangeStr,
          y: count,
          y2: 0,
          count,
          yAvg: count,
          y2Avg: 0,
        };
      });
      return buckets;
    }

    // Standard aggregated grouping
    const agg: Record<string, { x: string; y: number; y2: number; count: number }> = {};
    for (const row of rows) {
      const key = String(row[selectedX] ?? "null").slice(0, 24);
      const yVal = Number(row[selectedY] ?? 0);
      const y2Val = secondaryY ? Number(row[secondaryY] ?? 0) : 0;

      if (!agg[key]) {
        agg[key] = { x: key, y: 0, y2: 0, count: 0 };
      }
      agg[key].y += isNaN(yVal) ? 0 : yVal;
      agg[key].y2 += isNaN(y2Val) ? 0 : y2Val;
      agg[key].count += 1;
    }

    return Object.values(agg)
      .slice(0, 20)
      .map((item) => ({
        ...item,
        yAvg: Math.round((item.y / (item.count || 1)) * 100) / 100,
        y2Avg: Math.round((item.y2 / (item.count || 1)) * 100) / 100,
      }));
  }, [rows, selectedX, selectedY, secondaryY, selectedChartType]);

  // Scatter plot data
  const scatterData = useMemo(() => {
    if (!selectedX || !selectedY) return [];
    return rows.slice(0, 100).map((r) => ({
      x: Number(r[selectedX] ?? 0),
      y: Number(r[selectedY] ?? 0),
    }));
  }, [rows, selectedX, selectedY]);

  // ── Render Custom Selected Chart ──────────────────────────────────────────
  function renderCustomChart() {
    if (!customData.length && selectedChartType !== "SCATTER") {
      return (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No data available for the selected columns.
        </div>
      );
    }

    switch (selectedChartType) {
      case "LINE":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={customData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="x" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="y" name={selectedY} stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              {secondaryY ? <Line type="monotone" dataKey="y2" name={secondaryY} stroke={CHART_COLORS[1]} strokeWidth={2} strokeDasharray="4 4" /> : null}
            </LineChart>
          </ResponsiveContainer>
        );

      case "AREA":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={customData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="x" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="y" name={selectedY} stroke={CHART_COLORS[0]} fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "PIE":
      case "DONUT": {
        const isDonut = selectedChartType === "DONUT";
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={customData}
                dataKey="y"
                nameKey="x"
                cx="50%"
                cy="50%"
                innerRadius={isDonut ? 55 : 0}
                outerRadius={95}
                paddingAngle={2}
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {customData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--color-card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "RADAR":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart cx="50%" cy="50%" outerRadius={90} data={customData.slice(0, 8)}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="x" tick={AXIS_TICK} />
              <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={AXIS_TICK} />
              <Radar name={selectedY} dataKey="y" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.5} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "SCATTER":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 12, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="x" name={selectedX} tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} />
              <YAxis dataKey="y" name={selectedY} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3", stroke: "var(--color-border)" }} />
              <Scatter data={scatterData} fill={CHART_COLORS[2]} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "HISTOGRAM":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={customData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="x" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="y" name="Frequency" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "COMPOSED":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={customData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis dataKey="x" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="y" name={selectedY} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
              {secondaryY ? <Line type="monotone" dataKey="y2" name={secondaryY} stroke={CHART_COLORS[1]} strokeWidth={3} dot={{ r: 4 }} /> : null}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "BAR":
      default:
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={customData} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
              <XAxis dataKey="x" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
              <Bar dataKey="y" name={selectedY} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  }

  // ── Render Default Multi-Chart Grid ───────────────────────────────────────
  const autoCharts: React.ReactNode[] = [];

  if (numCols.length > 0 && strCols.length > 0) {
    const xKey = strCols[0];
    const yKey = numCols[0];
    const barData = Object.entries(
      rows.reduce<Record<string, number>>((acc, row) => {
        const key = String(row[xKey] ?? "null").slice(0, 20);
        acc[key] = (acc[key] ?? 0) + Number(row[yKey] ?? 0);
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));

    autoCharts.push(
      <Card key="bar-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{yKey} by {xKey}</CardTitle>
            <Badge variant="outline" className="text-[10px]">Bar Chart</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 35 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
              <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" tickLine={false} axisLine={AXIS_LINE} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={TOOLTIP_CURSOR} />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (dateCols.length > 0 && numCols.length > 0) {
    const xKey = dateCols[0];
    const yKey = numCols[0];
    const areaData = [...rows].sort(
      (a, b) => new Date(String(a[xKey])).getTime() - new Date(String(b[xKey])).getTime()
    );

    autoCharts.push(
      <Card key="area-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{yKey} trend over time</CardTitle>
            <Badge variant="outline" className="text-[10px]">Area Chart</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaAutoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
              <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} minTickGap={24} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey={yKey} stroke={CHART_COLORS[1]} fill="url(#areaAutoGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (strCols.length > 0) {
    const colName = strCols[0];
    const freq = rows.reduce<Record<string, number>>((acc, row) => {
      const k = String(row[colName] ?? "null").slice(0, 20);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const pieData = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name, value }));

    autoCharts.push(
      <Card key="donut-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{colName} distribution</CardTitle>
            <Badge variant="outline" className="text-[10px]">Donut Chart</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={false}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--color-card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (numCols.length >= 2) {
    const xKey = numCols[0];
    const yKey = numCols[1];
    const scatterDataAuto = rows.slice(0, 80).map((r) => ({ x: Number(r[xKey] ?? 0), y: Number(r[yKey] ?? 0) }));

    autoCharts.push(
      <Card key="scatter-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{xKey} vs {yKey}</CardTitle>
            <Badge variant="outline" className="text-[10px]">Scatter Plot</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.6} />
              <XAxis dataKey="x" name={xKey} tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} />
              <YAxis dataKey="y" name={yKey} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Scatter data={scatterDataAuto} fill={CHART_COLORS[2]} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Mode Toggle / Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-semibold">Visual Data Charts</span>
          <Badge variant="secondary" className="text-[10px]">
            9 Chart Types
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={viewMode === "auto" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode("auto")}
          >
            <BarChart3 className="size-3.5" />
            Auto Dashboard
          </Button>
          <Button
            variant={viewMode === "custom" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setViewMode("custom")}
          >
            <SlidersHorizontal className="size-3.5" />
            Chart Studio
          </Button>
        </div>
      </div>

      {/* ── View Mode: Custom Chart Studio ───────────────────────────────────── */}
      {viewMode === "custom" ? (
        <Card className="rounded-xl">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Interactive Chart Studio</CardTitle>
                <CardDescription className="text-xs">
                  Choose a chart type and select columns to customize your data visualizer.
                </CardDescription>
              </div>

              {/* Chart type selector buttons */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "BAR", label: "Bar" },
                    { id: "LINE", label: "Line" },
                    { id: "AREA", label: "Area" },
                    { id: "PIE", label: "Pie" },
                    { id: "DONUT", label: "Donut" },
                    { id: "RADAR", label: "Radar" },
                    { id: "SCATTER", label: "Scatter" },
                    { id: "HISTOGRAM", label: "Histogram" },
                    { id: "COMPOSED", label: "Combo" },
                  ] as const
                ).map(({ id, label }) => (
                  <Button
                    key={id}
                    variant={selectedChartType === id ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setSelectedChartType(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Column select dropdowns */}
            <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">X-Axis / Category:</label>
                <select
                  value={selectedX}
                  onChange={(e) => setSelectedX(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  {schema.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.inferredType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Y-Axis / Value:</label>
                <select
                  value={selectedY}
                  onChange={(e) => setSelectedY(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  {schema.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.inferredType})
                    </option>
                  ))}
                </select>
              </div>

              {(selectedChartType === "COMPOSED" || selectedChartType === "LINE") && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Secondary Y:</label>
                  <select
                    value={secondaryY}
                    onChange={(e) => setSecondaryY(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">(None)</option>
                    {numCols.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {renderCustomChart()}
          </CardContent>
        </Card>
      ) : (
        /* ── View Mode: Auto Charts Grid ─────────────────────────────────────── */
        <div className="grid gap-4 lg:grid-cols-2">
          {autoCharts.length > 0 ? (
            autoCharts
          ) : (
            <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">
              Not enough structured data to generate automatic charts. Switch to Chart Studio above to create custom charts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

