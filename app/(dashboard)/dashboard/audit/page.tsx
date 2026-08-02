import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Shield, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "Complete audit trail of all actions in your workspace.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

// Map action codes to human-readable labels
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  PROJECT_CREATED: { label: "Project created", color: "text-success" },
  PROJECT_UPDATED: { label: "Project updated", color: "text-info" },
  PROJECT_DELETED: { label: "Project deleted", color: "text-destructive" },
  DATASET_UPLOADED: { label: "Dataset uploaded", color: "text-success" },
  DATASET_DELETED: { label: "Dataset deleted", color: "text-destructive" },
  DATASET_CLEANED: { label: "Dataset cleaned", color: "text-info" },
  REPORT_GENERATED: { label: "Report generated", color: "text-primary" },
  REPORT_DELETED: { label: "Report deleted", color: "text-destructive" },
  QUERY_SAVED: { label: "Query saved", color: "text-info" },
  API_KEY_CREATED: { label: "API key created", color: "text-warning" },
  API_KEY_REVOKED: { label: "API key revoked", color: "text-destructive" },
  SETTINGS_UPDATED: { label: "Settings updated", color: "text-muted-foreground" },
  MEMBER_INVITED: { label: "Member invited", color: "text-success" },
  MEMBER_REMOVED: { label: "Member removed", color: "text-destructive" },
  ROLE_CHANGED: { label: "Role changed", color: "text-warning" },
};

export default async function AuditLogPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  // Visible project IDs for scoping
  const myProjects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: { id: true },
  });
  const projectIds = myProjects.map((p: { id: string }) => p.id);

  const where = {
    OR: [
      { actorId: user.id },
      { projectId: { in: projectIds } },
    ],
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Audit Log"
          description={`${total.toLocaleString()} events recorded`}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-4" />
          <span>Immutable audit trail</span>
        </div>
      </div>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const meta = log.metadata as Record<string, unknown>;
            const actionConfig = ACTION_LABELS[log.action] ?? { label: log.action, color: "text-muted-foreground" };
            const displayName = log.actor?.firstName
              ? `${log.actor.firstName} ${log.actor.lastName ?? ""}`.trim()
              : (log.actor?.email ?? "Unknown");

            return (
              <Card key={log.id} className="rounded-xl">
                <CardContent className="flex items-center gap-4 px-4 py-3">
                  <div className="flex size-2 shrink-0 items-center justify-center">
                    <span className={`size-2 rounded-full ${actionConfig.color.replace("text-", "bg-")}`} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="font-medium">{displayName}</span>
                    <span className={`font-medium ${actionConfig.color}`}>{actionConfig.label}</span>
                    {typeof meta?.entityName === "string" && (
                      <span className="text-muted-foreground">&quot;{meta.entityName}&quot;</span>
                    )}
                    {log.project && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        in{" "}
                        <span className="inline-block size-2 rounded-full" style={{ background: log.project.color }} />
                        {log.project.name}
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground" title={new Date(log.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => i + 1).map((p) => (
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
