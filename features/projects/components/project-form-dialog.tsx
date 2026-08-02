"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createProject, updateProject } from "@/features/projects/actions";
import { PROJECT_COLORS, createProjectSchema } from "@/features/projects/schemas";

/**
 * Create/edit dialog. One component serves both modes because the fields are
 * identical — `project` being present switches it to edit.
 *
 * The resolver uses the same Zod schema the Server Action re-validates with, so
 * client and server can't drift.
 */

// The form works with the pre-transform shape (tags typed one at a time).
type FormValues = z.input<typeof createProjectSchema>;

/** Only the fields the form reads — both list rows and detail records satisfy it. */
export type EditableProject = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  tags: string[];
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: EditableProject | null;
}) {
  const isEdit = Boolean(project);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "Create a project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name, description, color, and tags."
              : "Projects group your datasets, reports, and dashboards."}
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open and keyed to the target, so the form seeds
            from defaultValues on every open. A cancelled edit therefore can't
            leak into the next one, and no reset effect is needed. */}
        {open && (
          <ProjectForm
            key={project?.id ?? "new"}
            project={project}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  project,
  onDone,
}: {
  project?: EditableProject | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(project);
  const [tagDraft, setTagDraft] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      color: project?.color ?? PROJECT_COLORS[0],
      tags: project?.tags ?? [],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  // useWatch subscribes without returning an unmemoizable function, which keeps
  // the React Compiler able to optimize this component.
  const color = useWatch({ control, name: "color" }) ?? PROJECT_COLORS[0];
  const tags: string[] = useWatch({ control, name: "tags" }) ?? [];

  function commitTag() {
    const value = tagDraft.trim().toLowerCase();
    if (!value) return;
    if (tags.includes(value)) {
      setTagDraft("");
      return;
    }
    if (tags.length >= 8) {
      toast.error("Up to 8 tags per project");
      return;
    }
    setValue("tags", [...tags, value], { shouldDirty: true });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true }
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    // Branch rather than assigning a union — each action returns a different
    // payload shape and TypeScript can only narrow them separately.
    if (isEdit) {
      const result = await updateProject({ ...values, id: project!.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Project updated");
      onDone();
      router.refresh();
      return;
    }

    const result = await createProject(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(`"${values.name}" created`);
    onDone();
    router.push(`/dashboard/projects/${result.data.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          placeholder="Q3 Revenue Analysis"
          autoFocus
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "project-name-error" : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id="project-name-error" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="project-description"
          rows={3}
          placeholder="What question is this project answering?"
          className="resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium leading-none">Color</legend>
        <div className="flex flex-wrap gap-2 pt-1">
          {PROJECT_COLORS.map((swatch) => {
            const selected = color === swatch;
            return (
              <button
                key={swatch}
                type="button"
                onClick={() => setValue("color", swatch, { shouldDirty: true })}
                aria-label={`Use color ${swatch}`}
                aria-pressed={selected}
                className={cn(
                  "size-7 rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "hover:scale-110"
                )}
                style={{ backgroundColor: swatch }}
              />
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="project-tags">
          Tags <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="project-tags"
          placeholder="Type a tag and press Enter"
          value={tagDraft}
          onChange={(event) => setTagDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              // Enter must add a tag here, not submit the whole form.
              event.preventDefault();
              commitTag();
            } else if (event.key === "Backspace" && !tagDraft && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={commitTag}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" loading={isSubmitting}>
          {isEdit ? "Save changes" : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
