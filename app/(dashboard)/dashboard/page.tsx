import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Database, FileText, FolderKanban, HardDrive } from "lucide-react";
import { getCurrentDbUser, userDisplayName } from "@/lib/auth";
import { formatBytes, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getDashboardStats,
  getRecentActivity,
  getRecentProjects,
  getRecentReports,
} from "@/features/dashboard/queries";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import {
  QuickActions,
  RecentProjects,
  RecentReports,
} from "@/features/dashboard/components/dashboard-panels";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your projects, datasets, and AI reports at a glance.",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const [stats, activity, reports, projects] = await Promise.all([
    getDashboardStats(user.id),
    getRecentActivity(user.id),
    getRecentReports(user.id),
    getRecentProjects(user.id),
  ]);

  const isEmpty = stats.projectCount === 0 && stats.datasetCount === 0;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/20">
        {/* Ambient brand wash — decorative, so it stays out of the a11y tree. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl"
        />
        <CardContent className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting()}, {userDisplayName(user).split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEmpty
                ? "Start by creating a project, then upload a dataset to unlock AI analysis."
                : `You have ${formatNumber(stats.datasetCount)} dataset${
                    stats.datasetCount === 1 ? "" : "s"
                  } across ${formatNumber(stats.projectCount)} project${
                    stats.projectCount === 1 ? "" : "s"
                  }.`}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button asChild variant="gradient">
              <Link href="/dashboard/projects?new=1">New project</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/datasets?upload=1">Upload data</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projects"
          value={formatNumber(stats.projectCount)}
          icon={FolderKanban}
          accent="primary"
        />
        <StatCard
          label="Datasets"
          value={formatNumber(stats.datasetCount)}
          icon={Database}
          accent="info"
          delta={stats.datasetTrend}
          hint="vs. previous 30 days"
        />
        <StatCard
          label="AI reports"
          value={formatNumber(stats.reportCount)}
          icon={FileText}
          accent="success"
        />
        <StatCard
          label="Storage used"
          value={formatBytes(stats.storageBytes)}
          icon={HardDrive}
          accent="warning"
          hint={`${formatNumber(stats.fileCount)} file${stats.fileCount === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentProjects projects={projects} />
          <RecentReports reports={reports} />
        </div>

        <div className="space-y-6">
          <QuickActions />
          <ActivityFeed items={activity} />
        </div>
      </div>
    </div>
  );
}
