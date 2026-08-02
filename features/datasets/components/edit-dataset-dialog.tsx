"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDataset } from "@/features/datasets/actions";
import type { DatasetListItem } from "@/features/datasets/queries";

interface EditDatasetDialogProps {
  dataset: DatasetListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string; color: string }[];
}

/**
 * Remounts per dataset (caller sets `key={dataset.id}`), so the form seeds
 * straight from props without sync effects.
 */
export function EditDatasetDialog({
  dataset,
  open,
  onOpenChange,
  projects,
}: EditDatasetDialogProps) {
  const router = useRouter();
  const [name, setName] = React.useState(dataset.name);
  const [description, setDescription] = React.useState(dataset.description ?? "");
  const [projectId, setProjectId] = React.useState(dataset.project.id);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateDataset({
      id: dataset.id,
      name: trimmedName,
      description: description.trim(),
      projectId,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    toast.success("Dataset updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit dataset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-dataset-name">Dataset name</Label>
            <Input
              id="edit-dataset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Q4 2024"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dataset-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-dataset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the dataset…"
              maxLength={500}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dataset-project">Project</Label>
            <select
              id="edit-dataset-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive-on-surface">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
