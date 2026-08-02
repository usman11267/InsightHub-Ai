import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth";
import { listReports } from "@/features/reports/queries";
import { getProjectOptions } from "@/features/projects/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportGeneratorDialog } from "@/features/reports/components/report-generator";
import { FileText, Loader2, CheckCircle2, AlertCircle, Share2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Reports",
  description: "AI-generated data analysis reports.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

const STATUS_CONFIG = {
  READY: { icon: CheckCircle2, class: "text-success", label: "Ready" },
  GENERATING: { icon: Loader2, class: "text-warning animate-spin", label: "Generating…" },
  DRAFT: { icon: FileText, class: "text-muted-foreground", label: "Draft" },
  ERROR: { icon: AlertCircle, class: "text-destructive", label: "Error" },
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));

  const [{ items, pageCount }, projects] = await Promise.all([
    listReports(user.id, page),
    getProjectOptions(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Reports" description="AI-generated analysis reports from your datasets." />
        <ReportGeneratorDialog projects={projects} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first AI report by selecting a dataset and clicking 'New Report'."
        />
      ) : (
        <div className="space-y-3">
          {items.map((report) => {
            const sc = STATUS_CONFIG[report.status];
            const StatusIcon = sc.icon;

            return (
              <Card key={report.id} interactive className="group">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/reports/${report.id}`}
                        className="text-sm font-semibold hover:text-primary transition-colors truncate"
                      >
                        {report.title}
                      </Link>
                      <StatusIcon className={`size-3.5 shrink-0 ${sc.class}`} />
                      {report.shareSlug && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          <Share2 className="size-2.5 mr-1" /> Public
                        </Badge>
                      )}
                    </div>
                    {report.summary && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{report.summary}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="flex items-center gap-1"
                        style={{ color: report.project.color }}
                      >
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ background: report.project.color }}
                        />
                        {report.project.name}
                      </span>
                      {report.dataset && <span>· {report.dataset.name}</span>}
                      <span>· {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>

                  <Button asChild variant="ghost" size="sm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/reports/${report.id}`}>
                      <ExternalLink className="size-3.5" />
                      View
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}`}
              className={`flex size-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                p === page ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
