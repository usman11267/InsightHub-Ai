"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DatasetCard } from "@/features/datasets/components/dataset-card";
import { EditDatasetDialog } from "@/features/datasets/components/edit-dataset-dialog";
import { deleteDataset } from "@/features/datasets/actions";
import type { DatasetListItem } from "@/features/datasets/queries";
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

interface DatasetGridProps {
  datasets: DatasetListItem[];
  projects: { id: string; name: string; color: string }[];
}

export function DatasetGrid({ datasets, projects }: DatasetGridProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<DatasetListItem | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<DatasetListItem | null>(null);
  const [deleteInFlight, setDeleteInFlight] = React.useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteInFlight(true);
    const result = await deleteDataset({ id: deleting.id });
    setDeleteInFlight(false);

    if (result.success) {
      toast.success(`"${deleting.name}" deleted`);
      setDeleting(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {datasets.map((dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            onEdit={(d) => {
              setEditing(d);
              setEditOpen(true);
            }}
            onDelete={(id) => {
              const target = datasets.find((d) => d.id === id);
              if (target) setDeleting(target);
            }}
          />
        ))}
      </div>

      {editing && (
        <EditDatasetDialog
          key={editing.id}
          dataset={editing}
          projects={projects}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the dataset and its version history. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInFlight}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleteInFlight}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInFlight ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete dataset"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
