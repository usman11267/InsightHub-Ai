import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiGrid } from "@/features/analytics/components/kpi-grid";
import { AnalyticsCharts } from "@/features/analytics/components/analytics-charts";
import { computeKPIs, getNumericColumns, mean, median, stdDev, detectOutliers, topCategories, correlation } from "@/features/analytics/compute";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Database, Bot, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Auto-generated KPIs, statistics, and charts for your datasets.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const datasetId = sp.datasetId;

  // Load available datasets
  const datasets = await prisma.dataset.findMany({
    where: {
      status: "READY",
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, fileType: true, rowCount: true, columnCount: true },
  });

  // Load selected dataset detail
  const dataset = datasetId
    ? await prisma.dataset.findFirst({
        where: {
          id: datasetId,
          status: "READY",
          project: {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          },
        },
        select: { id: true, name: true, rowCount: true, columnCount: true, previewJson: true, schemaJson: true },
      })
    : datasets[0]
    ? await prisma.dataset.findUnique({
        where: { id: datasets[0].id },
        select: { id: true, name: true, rowCount: true, columnCount: true, previewJson: true, schemaJson: true },
      })
    : null;

  if (datasets.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No datasets yet"
        description="Upload a dataset to see analytics and charts."
        action={{ label: "Upload dataset", href: "/dashboard/datasets?upload=1" }}
      />
    );
  }

  const rows = (dataset?.previewJson as Record<string, unknown>[]) ?? [];
  const schema = (dataset?.schemaJson as { name: string; inferredType: string }[]) ?? [];
  const numCols = getNumericColumns(rows);
  const kpis = computeKPIs(rows, schema);

  // Column statistics
  const colStats = numCols.map((col) => ({
    name: col.name,
    count: col.values.length,
    mean: mean(col.values),
    median: median(col.values),
    stdDev: stdDev(col.values),
    outliers: detectOutliers(col.values).length,
  }));

  // Category analysis
  const strCols = schema.filter((c) => c.inferredType === "string");
  const categoryData = strCols.slice(0, 2).map((col) => ({
    column: col.name,
    top: topCategories(rows, col.name, 8),
  }));

  // Correlation matrix
  const corrPairs: { a: string; b: string; r: number }[] = [];
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      corrPairs.push({
        a: numCols[i].name,
        b: numCols[j].name,
        r: correlation(numCols[i].values, numCols[j].values),
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Analytics"
          description={dataset ? `Analyzing: ${dataset.name}` : "Select a dataset to analyze"}
        />
        <div className="flex items-center gap-2">
          {dataset && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/assistant?datasetId=${dataset.id}`}>
                <Bot className="size-4" /> Ask AI
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Dataset selector */}
      {datasets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {datasets.map((ds: { id: string; name: string }) => (
            <Link key={ds.id} href={`/dashboard/analytics?datasetId=${ds.id}`}>
              <Badge
                variant={ds.id === dataset?.id ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
              >
                {ds.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {dataset && rows.length > 0 ? (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            {corrPairs.length > 0 && <TabsTrigger value="correlation">Correlation</TabsTrigger>}
          </TabsList>

          {/* ── Overview ─────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <KpiGrid kpis={kpis} />
            <AnalyticsCharts rows={rows} schema={schema} />
          </TabsContent>

          {/* ── Statistics ───────────────────────────────────── */}
          <TabsContent value="statistics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Numeric Column Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {colStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No numeric columns found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          {["Column", "Count", "Mean", "Median", "Std Dev", "Outliers"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {colStats.map((s) => (
                          <tr key={s.name} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 font-mono text-xs font-medium">{s.name}</td>
                            <td className="px-4 py-2.5 tabular-nums">{s.count.toLocaleString()}</td>
                            <td className="px-4 py-2.5 tabular-nums">{s.mean.toFixed(2)}</td>
                            <td className="px-4 py-2.5 tabular-nums">{s.median.toFixed(2)}</td>
                            <td className="px-4 py-2.5 tabular-nums">{s.stdDev.toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              {s.outliers > 0 ? (
                                <span className="flex items-center gap-1 text-warning-on-surface">
                                  <AlertTriangle className="size-3" /> {s.outliers}
                                </span>
                              ) : (
                                <span className="text-success-on-surface">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Categories ───────────────────────────────────── */}
          <TabsContent value="categories" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {categoryData.map((cat) => (
                <Card key={cat.column}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top values: {cat.column}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cat.top.map((item) => (
                      <div key={item.value} className="flex items-center gap-3">
                        <span className="w-32 truncate text-xs text-muted-foreground" title={item.value}>{item.value}</span>
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-xs tabular-nums">{item.count}</span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{item.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {categoryData.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">No categorical columns found.</p>
              )}
            </div>
          </TabsContent>

          {/* ── Correlation ──────────────────────────────────── */}
          {corrPairs.length > 0 && (
            <TabsContent value="correlation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Correlation Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {corrPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).map((pair) => {
                      const absR = Math.abs(pair.r);
                      const color = absR > 0.7 ? "bg-success" : absR > 0.4 ? "bg-warning" : "bg-muted-foreground/30";
                      return (
                        <div key={`${pair.a}-${pair.b}`} className="flex items-center gap-3">
                          <span className="w-44 truncate text-xs">{pair.a} ↔ {pair.b}</span>
                          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${absR * 100}%` }} />
                          </div>
                          <span className={`w-12 text-right text-xs tabular-nums font-medium ${pair.r > 0 ? "text-success-on-surface" : "text-destructive-on-surface"}`}>
                            {pair.r.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No preview data"
          description="This dataset has no parsed preview rows available."
        />
      )}
    </div>
  );
}
