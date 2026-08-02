import Link from "next/link";
import { Database, FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatBytes, formatNumber, formatRelativeTime } from "@/lib/utils";
import type {
  getProjectDatasets,
  getProjectReports,
} from "@/features/projects/queries";

type Dataset = Awaited<ReturnType<typeof getProjectDatasets>>[number];
type Report = Awaited<ReturnType<typeof getProjectReports>>[number];

const DATASET_STATUS_VARIANT = {
  READY: "success",
  PROCESSING: "info",
  ERROR: "destructive",
} as const;

const REPORT_STATUS_VARIANT = {
  READY: "success",
  GENERATING: "info",
  DRAFT: "muted",
  ERROR: "destructive",
} as const;

export function DatasetsPanel({
  datasets,
  projectId,
  canUpload,
}: {
  datasets: Dataset[];
  projectId: string;
  canUpload: boolean;
}) {
  if (datasets.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No datasets yet"
        description="Upload a CSV, Excel, or JSON file to start exploring and analyzing your data."
        action={
          canUpload
            ? {
                label: "Upload dataset",
                icon: Upload,
                href: `/dashboard/datasets?upload=1&project=${projectId}`,
              }
            : undefined
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {datasets.map((dataset) => (
        <li key={dataset.id}>
          <Link
            href={`/dashboard/datasets/${dataset.id}`}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Database className="size-4 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{dataset.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {dataset.fileType} · {formatNumber(dataset.rowCount)} rows ·{" "}
                {dataset.columnCount} cols · {formatBytes(dataset.fileSize)}
              </p>
            </div>

            <Badge
              variant={DATASET_STATUS_VARIANT[dataset.status]}
              className="hidden shrink-0 sm:inline-flex"
            >
              {dataset.status.toLowerCase()}
            </Badge>

            <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
              {formatRelativeTime(dataset.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ReportsPanel({
  reports,
  projectId,
  canCreate,
}: {
  reports: Report[];
  projectId: string;
  canCreate: boolean;
}) {
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No reports yet"
        description="Generate an AI report to turn this project's data into an executive summary with insights and recommendations."
        action={
          canCreate
            ? { label: "Generate report", href: `/dashboard/reports?project=${projectId}` }
            : undefined
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {reports.map((report) => {
        const author =
          [report.author.firstName, report.author.lastName].filter(Boolean).join(" ") ||
          report.author.email;

        return (
          <li key={report.id}>
            <Link
              href={`/dashboard/reports/${report.id}`}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{report.title}</p>
                {report.summary && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {report.summary}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {author} · {formatRelativeTime(report.createdAt)}
                </p>
              </div>

              <Badge variant={REPORT_STATUS_VARIANT[report.status]} className="shrink-0">
                {report.status.toLowerCase()}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PanelFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center pt-3">
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
