"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCcw, GitCommit, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { restoreDatasetVersion } from "@/features/datasets/actions";
import { toast } from "sonner";

interface Version {
  id: string;
  version: number;
  label: string;
  rowCount: number;
  storagePath: string | null;
  createdAt: Date;
}

interface VersionHistoryProps {
  datasetId: string;
  versions: Version[];
  currentVersion?: number;
  canEdit: boolean;
}

export function VersionHistory({ datasetId, versions, currentVersion, canEdit }: VersionHistoryProps) {
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  async function handleRestore(versionId: string, versionNum: number) {
    setRestoringId(versionId);
    try {
      const result = await restoreDatasetVersion({ datasetId, versionId });
      if (result.success) {
        toast.success(`Restored to v${versionNum}. New version v${result.data.version} created.`);
      } else {
        toast.error(result.error);
      }
    } finally {
      setRestoringId(null);
    }
  }

  if (!versions.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No version history yet.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />

      {versions.map((v, i) => {
        const isCurrent = v.version === currentVersion;
        const isRestoring = restoringId === v.id;

        return (
          <div key={v.id} className="relative flex gap-4 py-3">
            {/* Node */}
            <div
              className={cn(
                "relative z-10 mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                isCurrent
                  ? "border-primary bg-primary"
                  : "border-border bg-background"
              )}
            >
              <GitCommit
                className={cn("size-2.5", isCurrent ? "text-primary-foreground" : "text-muted-foreground")}
              />
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">v{v.version}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Current
                    </span>
                  )}
                  {i === 0 && !isCurrent && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Latest
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{v.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {v.rowCount.toLocaleString()} rows ·{" "}
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                </p>
              </div>

              {canEdit && !isCurrent && i !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  disabled={!!restoringId}
                  onClick={() => handleRestore(v.id, v.version)}
                >
                  {isRestoring ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3" />
                  )}
                  Restore
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
