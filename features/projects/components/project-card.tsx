"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Database,
  FileText,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import { deleteProject, toggleFavorite } from "@/features/projects/actions";
import type { ProjectListItem } from "@/features/projects/queries";

/**
 * Single project tile. Favorite toggling is optimistic — the star flips
 * immediately and rolls back if the server rejects it, so the grid never feels
 * like it's waiting on the network.
 */
export function ProjectCard({
  project,
  canEdit,
  isOwner,
  onEdit,
}: {
  project: ProjectListItem;
  canEdit: boolean;
  isOwner: boolean;
  onEdit: (project: ProjectListItem) => void;
}) {
  const router = useRouter();
  // useOptimistic re-syncs to the prop automatically once the transition ends,
  // so a rejected toggle rolls back without an effect or manual bookkeeping.
  const [isFavorite, setIsFavorite] = React.useOptimistic(project.isFavorite);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  function handleFavorite(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    React.startTransition(async () => {
      setIsFavorite(!isFavorite);
      const result = await toggleFavorite({ id: project.id });
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProject({ id: project.id });
    setDeleting(false);

    if (result.success) {
      toast.success(`"${project.name}" deleted`);
      setConfirmOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]">
        {/* Color rail keyed to the project's accent. */}
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: project.color }}
          aria-hidden="true"
        />

        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex flex-1 flex-col p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 pr-14 text-base font-semibold tracking-tight">
              {project.name}
            </h3>
            {project.status === "ARCHIVED" && (
              <Badge variant="muted" className="shrink-0">
                archived
              </Badge>
            )}
          </div>

          <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {project.description || "No description"}
          </p>

          {project.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <Badge variant="outline">+{project.tags.length - 3}</Badge>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5" title="Datasets">
              <Database className="size-3.5" />
              {project._count.datasets}
            </span>
            <span className="flex items-center gap-1.5" title="Reports">
              <FileText className="size-3.5" />
              {project._count.reports}
            </span>
            <span className="flex items-center gap-1.5" title="Members">
              <Users className="size-3.5" />
              {project._count.members + 1}
            </span>
            <span className="ml-auto shrink-0">
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
        </Link>

        {/* Overlay controls sit above the link so they win the click. */}
        <div className="absolute right-3 top-4 flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
          >
            <Star
              className={cn(
                "transition-colors",
                isFavorite ? "fill-warning text-warning" : "text-muted-foreground"
              )}
            />
          </Button>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More actions for ${project.name}`}
                >
                  <MoreHorizontal className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(project)}>
                  <Pencil />
                  Edit details
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onSelect={(event) => {
                        // Keep the menu's close animation from eating the dialog.
                        event.preventDefault();
                        setConfirmOpen(true);
                      }}
                    >
                      <Trash2 />
                      Delete project
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project along with its{" "}
              {project._count.datasets} dataset
              {project._count.datasets === 1 ? "" : "s"} and {project._count.reports}{" "}
              report{project._count.reports === 1 ? "" : "s"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
