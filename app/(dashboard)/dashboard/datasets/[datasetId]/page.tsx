import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getDatasetDetail, getDatasetVersions } from "@/features/datasets/queries";
import { DatasetTable } from "@/features/datasets/components/dataset-table";
import { VersionHistory } from "@/features/datasets/components/version-history";
import { SchemaViewer, type ColumnInfo } from "@/features/datasets/components/schema-viewer";
import { CleaningPanel } from "@/features/data-cleaning/components/cleaning-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatBytes, formatNumber } from "@/lib/utils";
import { PREVIEW_ROW_COUNT } from "@/features/datasets/schemas";
import {
  FileText,
  FileSpreadsheet,
  FileJson,
  Rows3,
  Columns3,
  HardDrive,
  Bot,
  BarChart3,
  Layers,
} from "lucide-react";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ datasetId: string }>;
}): Promise<Metadata> {
  const { datasetId } = await params;
  return { title: `Dataset · ${datasetId}` };
}

import { FileType, DatasetStatus } from "@prisma/client";

const FILE_ICONS: Record<FileType, typeof FileText> = { CSV: FileText, XLSX: FileSpreadsheet, JSON: FileJson };

const statusColors: Record<DatasetStatus, string> = {
  READY: "bg-success/10 text-success-on-surface border-success/20",
  PROCESSING: "bg-warning/10 text-warning-on-surface border-warning/20",
  ERROR: "bg-destructive/10 text-destructive-on-surface border-destructive/20",
};

export default async function DatasetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ datasetId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const { datasetId } = await params;
  const sp = (await searchParams) ?? {};
  const TABS = ["preview", "schema", "clean", "versions"];
  const activeTab = TABS.includes(sp.tab) ? sp.tab : "preview";

  let dataset;
  try {
    dataset = await getDatasetDetail(user.id, datasetId);
  } catch {
    notFound();
  }

  let versions: Awaited<ReturnType<typeof getDatasetVersions>> = [];
  try {
    versions = (await getDatasetVersions(datasetId)) ?? [];
  } catch {
    versions = [];
  }

  const Icon = FILE_ICONS[dataset.fileType] ?? FileText;
  const statusStyle = statusColors[dataset.status] ?? "bg-muted text-muted-foreground";
  const allRows = Array.isArray(dataset.previewJson)
    ? (dataset.previewJson as Record<string, unknown>[])
    : [];
  const previewRows = allRows.slice(0, PREVIEW_ROW_COUNT);
  const schema = Array.isArray(dataset.schemaJson)
    ? (dataset.schemaJson as unknown as ColumnInfo[])
    : [];
  const project = dataset.project ?? { id: "", name: "Project", color: "#3b82f6" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <PageHeader title={dataset.name} description={dataset.description ?? undefined} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle}`}
              >
                {dataset.status}
              </span>
              <Badge variant="outline">{dataset.fileType}</Badge>
              {project.id ? (
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: project.color }}
                  />
                  {project.name}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/assistant?datasetId=${dataset.id}`}>
              <Bot className="size-4" />
              Ask AI
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/analytics?datasetId=${dataset.id}`}>
              <BarChart3 className="size-4" />
              Analyze
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Rows", value: formatNumber(dataset.rowCount), icon: Rows3 },
          { label: "Columns", value: formatNumber(dataset.columnCount), icon: Columns3 },
          { label: "File size", value: formatBytes(dataset.fileSize), icon: HardDrive },
          { label: "Versions", value: String(versions.length), icon: Layers },
        ].map(({ label, value, icon: I }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <I className="size-4" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="clean">Clean</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Data Preview{" "}
                <span className="font-normal text-muted-foreground text-sm">
                  (first {previewRows.length}
                  {allRows.length > previewRows.length
                    ? ` of ${formatNumber(allRows.length)} rows`
                    : " rows"}
                  )
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DatasetTable rows={previewRows} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Column Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <SchemaViewer schema={schema} rowCount={dataset.rowCount} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clean" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Data Cleaning</CardTitle>
            </CardHeader>
            <CardContent>
              <CleaningPanel
                datasetId={dataset.id}
                schema={schema}
                canEdit={dataset.canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionHistory
                datasetId={dataset.id}
                versions={versions}
                canEdit={dataset.canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
