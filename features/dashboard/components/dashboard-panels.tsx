import Link from "next/link";
import { ArrowRight, Database, FileText, FolderKanban, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import type { getRecentProjects, getRecentReports } from "@/features/dashboard/queries";

type Project = Awaited<ReturnType<typeof getRecentProjects>>[number];
type Report = Awaited<ReturnType<typeof getRecentReports>>[number];

const QUICK_ACTIONS = [
  {
    label: "New project",
    description: "Group datasets and reports",
    href: "/dashboard/projects?new=1",
    icon: FolderKanban,
  },
  {
    label: "Upload dataset",
    description: "CSV, Excel, or JSON",
    href: "/dashboard/datasets?upload=1",
    icon: Upload,
  },
  {
    label: "Ask the assistant",
    description: "Query your data in plain English",
    href: "/dashboard/assistant",
    icon: Sparkles,
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {QUICK_ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentProjects({ projects }: { projects: Project[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent projects</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/projects">
            View all
            <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No projects yet.{" "}
            <Link href="/dashboard/projects?new=1" className="text-primary hover:underline">
              Create your first one
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="block rounded-lg border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />
                    <p className="truncate text-sm font-semibold">{project.name}</p>
                  </div>

                  {project.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Database className="size-3" />
                      {project._count.datasets}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="size-3" />
                      {project._count.reports}
                    </span>
                    <span className="ml-auto">{formatRelativeTime(project.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentReports({ reports }: { reports: Report[] }) {
  const statusVariant = {
    READY: "success",
    GENERATING: "info",
    DRAFT: "muted",
    ERROR: "destructive",
  } as const;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent reports</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/reports">
            View all
            <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No reports yet. Upload a dataset and generate one.
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{report.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {report.project.name} · {formatRelativeTime(report.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusVariant[report.status]} className="shrink-0">
                    {report.status.toLowerCase()}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
