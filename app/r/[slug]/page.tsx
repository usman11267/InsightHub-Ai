import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Database, FileText, LayoutDashboard, User } from "lucide-react";
import { getReportByShareSlug } from "@/features/reports/queries";
import { markdownToHtml } from "@/features/reports/lib/report-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = await getReportByShareSlug(slug);
  if (!report) return { title: "Shared report" };
  return {
    title: report.title,
    description: report.summary ?? "Shared analysis report",
  };
}

export default async function SharedReportPage({ params }: SharePageProps) {
  const { slug } = await params;
  const report = await getReportByShareSlug(slug);
  if (!report) notFound();

  const content = report.contentJson as { markdown?: string; error?: string } | null;
  const markdown = content?.markdown ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Slim public bar */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg gradient-brand">
              <Image
                src="/logo-mark.png"
                alt="InsightHub AI"
                width={20}
                height={20}
                className="size-4 object-contain"
              />
            </span>
            InsightHub AI
          </Link>
          <Badge variant="outline" className="gap-1.5 text-[10px]">
            <FileText className="size-3" />
            Shared report
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 pb-24">
        {/* Report header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" />
              {report.author.firstName ?? "Unknown"} {report.author.lastName ?? ""}
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {report.title}
          </h1>

          {report.summary && (
            <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <LayoutDashboard className="size-4" style={{ color: report.project.color }} />
              {report.project.name}
            </span>
            {report.dataset && (
              <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
                <Database className="size-4 text-primary" />
                {report.dataset.name}
              </span>
            )}
          </div>
        </div>

        {/* Report body */}
        {report.status !== "READY" ? (
          <Card className="mt-10 border-warning/20 bg-gradient-to-b from-warning/5 to-transparent">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {report.status === "GENERATING" ? "Report is still being generated" : "Report unavailable"}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {report.status === "GENERATING"
                  ? "The author is still crafting this report. Check back shortly."
                  : "This report could not be generated successfully."}
              </p>
            </CardContent>
          </Card>
        ) : markdown ? (
          <div className="mt-10">
            <div
              className="prose prose-slate max-w-none dark:prose-invert 
                prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight 
                prose-h1:text-3xl prose-h1:text-foreground
                prose-h2:mt-10 prose-h2:text-2xl prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
                prose-h3:text-xl prose-h3:text-foreground/90
                prose-p:leading-relaxed prose-p:text-muted-foreground
                prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80
                prose-strong:font-semibold prose-strong:text-foreground
                prose-ul:list-outside prose-ul:pl-6 prose-li:marker:text-primary
                prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:pr-4 prose-blockquote:pl-6 prose-blockquote:rounded-r-lg prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-muted/50 
                prose-code:rounded-md prose-code:bg-muted/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-medium
                prose-img:rounded-xl prose-img:border prose-img:shadow-sm
                prose-table:w-full prose-table:overflow-hidden prose-table:rounded-xl prose-table:border prose-table:border-border/60 prose-table:text-sm
                prose-thead:bg-muted/60 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
                prose-td:border-t prose-td:border-border/50 prose-td:px-4 prose-td:py-2.5 prose-td:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
            />
          </div>
        ) : (
          <Card className="mt-10">
            <CardContent className="p-16 text-center text-sm text-muted-foreground">
              This report has no content yet.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
