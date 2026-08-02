import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getReportDetail } from "@/features/reports/queries";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, Loader2, AlertCircle, CheckCircle2, Calendar, Sparkles, Database, LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ReportActions } from "@/features/reports/components/report-viewer";

export const metadata: Metadata = { title: "Report" };

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const { reportId } = await params;
  const report = await getReportDetail(user.id, reportId);
  if (!report) notFound();

  const content = report.contentJson as { markdown?: string; error?: string } | null;
  const markdown = content?.markdown ?? "";
  const errorMsg = content?.error;

  const STATUS_CONFIG = {
    READY: { icon: CheckCircle2, label: "Generated", class: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    GENERATING: { icon: Loader2, label: "Generating…", class: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    DRAFT: { icon: FileText, label: "Draft", class: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
    ERROR: { icon: AlertCircle, label: "Error", class: "text-red-500 bg-red-500/10 border-red-500/20" },
  };
  const sc = STATUS_CONFIG[report.status];
  const StatusIcon = sc.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-primary/10 via-background to-background p-8 shadow-2xl backdrop-blur-3xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${sc.class}`}>
                <StatusIcon className={`size-3.5 ${report.status === "GENERATING" ? "animate-spin" : ""}`} />
                {sc.label}
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3.5" />
                {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              {report.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link 
                href={`/dashboard/projects/${report.project.id}`} 
                className="flex items-center gap-2 rounded-lg bg-card/50 px-3 py-1.5 transition-colors hover:bg-card hover:text-foreground"
              >
                <LayoutDashboard className="size-4" style={{ color: report.project.color }} />
                {report.project.name}
              </Link>
              {report.dataset && (
                <Link 
                  href={`/dashboard/datasets/${report.dataset.id}`} 
                  className="flex items-center gap-2 rounded-lg bg-card/50 px-3 py-1.5 transition-colors hover:bg-card hover:text-foreground"
                >
                  <Database className="size-4 text-primary" />
                  {report.dataset.name}
                </Link>
              )}
            </div>
          </div>
          <div className="relative z-10 shrink-0">
            <ReportActions reportId={report.id} shareSlug={report.shareSlug} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      {report.status === "GENERATING" && (
        <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <Sparkles className="size-8 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">AI is crafting your report</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              We&apos;re analyzing the data and generating insights. This usually takes 10–30 seconds. Refresh to see the result.
            </p>
          </CardContent>
        </Card>
      )}

      {report.status === "ERROR" && (
        <Card className="overflow-hidden border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <AlertCircle className="size-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Report generation failed</h3>
            {errorMsg && <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>}
          </CardContent>
        </Card>
      )}

      {report.status === "READY" && markdown && (
        <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-0">
            <div className="bg-muted/30 border-b border-border/50 px-8 py-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Analysis Findings</h2>
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-500">Analysis Complete</span>
              </div>
            </div>
            <div className="p-8 sm:p-12">
              <div
                className="prose prose-slate max-w-none dark:prose-invert 
                  prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight 
                  prose-h1:text-3xl prose-h1:bg-gradient-to-r prose-h1:from-foreground prose-h1:to-foreground/70 prose-h1:bg-clip-text prose-h1:text-transparent
                  prose-h2:mt-10 prose-h2:text-2xl prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
                  prose-h3:text-xl prose-h3:text-foreground/90
                  prose-p:leading-relaxed prose-p:text-muted-foreground
                  prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80
                  prose-strong:font-semibold prose-strong:text-foreground
                  prose-ul:list-outside prose-ul:pl-6 prose-li:marker:text-primary
                  prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:pl-6 prose-blockquote:rounded-r-lg prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                  prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-muted/50 
                  prose-code:rounded-md prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-medium
                  prose-img:rounded-xl prose-img:border prose-img:shadow-sm"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(markdown),
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|p|l|c|p])(.+)$/gm, "<p>$1</p>");
}
