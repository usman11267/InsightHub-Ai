"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  deleteProject,
  toggleFavorite,
  updateProject,
} from "@/features/projects/actions";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import type { ProjectDetail } from "@/features/projects/queries";

/**
 * Action cluster for the project detail header. Split from the page so the
 * page itself stays a Server Component.
 */
export function ProjectHeaderActions({
  project,
  canEdit,
  isOwner,
}: {
  project: ProjectDetail;
  canEdit: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  // useOptimistic re-syncs to the prop automatically once the transition ends,
  // so a rejected toggle rolls back without an effect or manual bookkeeping.
  const [isFavorite, setIsFavorite] = React.useOptimistic(project.isFavorite);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  function handleFavorite() {
    React.startTransition(async () => {
      setIsFavorite(!isFavorite);
      const result = await toggleFavorite({ id: project.id });
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleArchiveToggle() {
    const nextStatus = project.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    setBusy(true);
    const result = await updateProject({ id: project.id, status: nextStatus });
    setBusy(false);

    if (result.success) {
      toast.success(nextStatus === "ARCHIVED" ? "Project archived" : "Project restored");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteProject({ id: project.id });
    setBusy(false);

    if (result.success) {
      toast.success(`"${project.name}" deleted`);
      router.push("/dashboard/projects");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
        >
          <Star className={cn(isFavorite && "fill-warning text-warning")} />
        </Button>

        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More project actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={busy} onSelect={() => void handleArchiveToggle()}>
                {project.status === "ARCHIVED" ? <ArchiveRestore /> : <Archive />}
                {project.status === "ARCHIVED" ? "Restore project" : "Archive project"}
              </DropdownMenuItem>

              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onSelect={(event) => {
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

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{project.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {project._count.datasets} dataset
              {project._count.datasets === 1 ? "" : "s"}, {project._count.reports} report
              {project._count.reports === 1 ? "" : "s"}, and all saved charts and queries.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
