import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  Database,
  FileText,
  Table2,
} from "lucide-react";
import { getCurrentDbUser, NotFoundError, userDisplayName } from "@/lib/auth";
import { getProjectRole } from "@/lib/authorization";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import {
  getProjectActivity,
  getProjectDatasets,
  getProjectDetail,
  getProjectReports,
} from "@/features/projects/queries";
import { ProjectHeaderActions } from "@/features/projects/components/project-header-actions";
import { TeamPanel } from "@/features/projects/components/team-panel";
import {
  DatasetsPanel,
  ReportsPanel,
} from "@/features/projects/components/project-panels";

type PageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await getCurrentDbUser();
  if (!user) return { title: "Project" };

  const { projectId } = await params;
  try {
    const project = await getProjectDetail(user.id, projectId);
    return {
      title: project.name,
      description: project.description ?? "Project overview",
    };
  } catch {
    return { title: "Project not found" };
  }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const { projectId } = await params;

  let project;
  try {
    project = await getProjectDetail(user.id, projectId);
  } catch (error) {
    // A project that's missing and one that's invisible both render as 404, so
    // project ids can't be probed for existence.
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [datasets, reports, activity, role] = await Promise.all([
    getProjectDatasets(project.id),
    getProjectReports(project.id),
    getProjectActivity(project.id),
    getProjectRole(user.id, project.id),
  ]);

  const isOwner = project.ownerId === user.id;
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const canManageTeam = role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Link href="/dashboard/projects" className="hover:text-foreground">
              Projects
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="truncate text-foreground">{project.name}</span>
          </nav>
        }
        title={
          <span className="flex items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden="true"
            />
            {project.name}
            {project.status === "ARCHIVED" && <Badge variant="muted">archived</Badge>}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{project.description || "No description"}</span>
            <span aria-hidden="true">·</span>
            <span>Owned by {userDisplayName(project.owner)}</span>
            {role && (
              <>
                <span aria-hidden="true">·</span>
                <Badge variant="secondary">your role: {role.toLowerCase()}</Badge>
              </>
            )}
          </span>
        }
        actions={
          <ProjectHeaderActions project={project} canEdit={canEdit} isOwner={isOwner} />
        }
      />

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <Link key={tag} href={`/dashboard/projects?tag=${encodeURIComponent(tag)}`}>
              <Badge variant="secondary" className="hover:bg-secondary/70">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Datasets"
          value={formatNumber(project._count.datasets)}
          icon={Database}
          accent="primary"
        />
        <StatCard
          label="Reports"
          value={formatNumber(project._count.reports)}
          icon={FileText}
          accent="success"
        />
        <StatCard
          label="Charts"
          value={formatNumber(project._count.charts)}
          icon={BarChart3}
          accent="info"
        />
        <StatCard
          label="Saved queries"
          value={formatNumber(project._count.queries)}
          icon={Table2}
          accent="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="datasets">
            <TabsList>
              <TabsTrigger value="datasets">
                Datasets
                {project._count.datasets > 0 && (
                  <Badge variant="muted">{project._count.datasets}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports">
                Reports
                {project._count.reports > 0 && (
                  <Badge variant="muted">{project._count.reports}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="datasets" className="mt-4">
              <DatasetsPanel
                datasets={datasets}
                projectId={project.id}
                canUpload={canEdit}
              />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <ReportsPanel
                reports={reports}
                projectId={project.id}
                canCreate={canEdit}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <TeamPanel
            project={project}
            currentUserId={user.id}
            canManage={canManageTeam}
          />
          <ActivityFeed items={activity} />
        </div>
      </div>
    </div>
  );
}
