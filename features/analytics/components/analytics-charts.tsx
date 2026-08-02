"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

type Row = Record<string, unknown>;

interface AnalyticsChartsProps {
  rows: Row[];
  schema: { name: string; inferredType: string }[];
}

export function AnalyticsCharts({ rows, schema }: AnalyticsChartsProps) {
  const numCols = schema.filter((c) => c.inferredType === "number").map((c) => c.name);
  const strCols = schema.filter((c) => c.inferredType === "string" || c.inferredType === "boolean").map((c) => c.name);
  const dateCols = schema.filter((c) => c.inferredType === "date").map((c) => c.name);

  const charts: React.ReactNode[] = [];

  // ── Distribution bar chart for numeric columns ───────────────────────
  if (numCols.length > 0 && strCols.length > 0) {
    const xKey = strCols[0];
    const yKey = numCols[0];

    const aggregated = Object.entries(
      rows.reduce<Record<string, number>>((acc, row) => {
        const key = String(row[xKey] ?? "null").slice(0, 20);
        acc[key] = (acc[key] ?? 0) + Number(row[yKey] ?? 0);
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value]) => ({ name, value }));

    charts.push(
      <Card key="bar" className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{yKey} by {xKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={aggregated} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }} />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // ── Line / area chart for date + numeric ─────────────────────────────
  if (dateCols.length > 0 && numCols.length > 0) {
    const xKey = dateCols[0];
    const yKey = numCols[0];
    const sorted = [...rows].sort(
      (a, b) => new Date(String(a[xKey])).getTime() - new Date(String(b[xKey])).getTime()
    );

    charts.push(
      <Card key="area" className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{yKey} over time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sorted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} fill="url(#grad0)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // ── Pie chart for categorical columns ────────────────────────────────
  if (strCols.length > 0) {
    const colName = strCols[0];
    const freq = rows.reduce<Record<string, number>>((acc, row) => {
      const k = String(row[colName] ?? "null").slice(0, 20);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const pieData = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

    charts.push(
      <Card key="pie">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{colName} distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // ── Scatter plot for 2 numeric columns ──────────────────────────────
  if (numCols.length >= 2) {
    const xKey = numCols[0];
    const yKey = numCols[1];
    const scatterData = rows.map((r) => ({ x: Number(r[xKey] ?? 0), y: Number(r[yKey] ?? 0) }));

    charts.push(
      <Card key="scatter">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{xKey} vs {yKey}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="x" name={xKey} tick={{ fontSize: 11 }} />
              <YAxis dataKey="y" name={yKey} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Scatter data={scatterData} fill={CHART_COLORS[2]} opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (charts.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Not enough structured data to generate charts. Upload a dataset with numeric columns.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {charts}
    </div>
  );
}
