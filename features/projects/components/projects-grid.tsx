"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Plus, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import type { ProjectListItem } from "@/features/projects/queries";
import type { ProjectFilters } from "@/features/projects/schemas";

/**
 * Client shell for the projects list.
 *
 * Filters live in the URL rather than component state, which makes every view
 * shareable and bookmarkable and lets the server do the filtering. The search
 * box is debounced so typing doesn't fire a request per keystroke.
 */
export function ProjectsGrid({
  projects,
  tags,
  filters,
  pageCount,
  total,
  openCreateOnMount,
}: {
  projects: ProjectListItem[];
  tags: string[];
  filters: ProjectFilters;
  pageCount: number;
  total: number;
  openCreateOnMount: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = React.useState(openCreateOnMount);
  const [editing, setEditing] = React.useState<ProjectListItem | null>(null);
  const [searchDraft, setSearchDraft] = React.useState(filters.q ?? "");

  /** Rewrites the query string, resetting pagination on any filter change. */
  const applyParams = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // A filter change invalidates the current page number.
      if (!("page" in changes)) params.delete("page");
      // `new=1` is a one-shot trigger; don't let it persist in shared links.
      params.delete("new");

      const query = params.toString();
      router.push(query ? `/dashboard/projects?${query}` : "/dashboard/projects");
    },
    [router, searchParams]
  );

  // Debounce search so each keystroke doesn't hit the server.
  React.useEffect(() => {
    const current = filters.q ?? "";
    if (searchDraft === current) return;

    const timer = setTimeout(() => applyParams({ q: searchDraft || null }), 350);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.q, applyParams]);

  function openEdit(project: ProjectListItem) {
    setEditing(project);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditing(null);
  }

  const hasActiveFilters =
    Boolean(filters.q) ||
    Boolean(filters.tag) ||
    filters.favorites ||
    filters.status !== "ACTIVE";

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="pl-9 pr-9"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => setSearchDraft("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filters.favorites ? "default" : "outline"}
              size="sm"
              onClick={() => applyParams({ favorites: filters.favorites ? null : "1" })}
              aria-pressed={filters.favorites}
            >
              <Star className={cn(filters.favorites && "fill-current")} />
              Favorites
            </Button>

            {tags.length > 0 && (
              <Select
                value={filters.tag ?? "all"}
                onValueChange={(value) =>
                  applyParams({ tag: value === "all" ? null : value })
                }
              >
                <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Filter by tag">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={filters.status}
              onValueChange={(value) => applyParams({ status: value })}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
                <SelectItem value="ALL">All statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sort}
              onValueChange={(value) => applyParams({ sort: value })}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Sort projects">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently updated</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="datasets">Most datasets</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="lg:ml-auto"
            >
              <Plus />
              New project
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {total} project{total === 1 ? "" : "s"} match
            </span>
            {filters.tag && <Badge variant="secondary">tag: {filters.tag}</Badge>}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setSearchDraft("");
                router.push("/dashboard/projects");
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {projects.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={Search}
              title="No matching projects"
              description="Try a different search term, or clear the filters to see everything."
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Create your first project"
              description="Projects group related datasets, reports, and dashboards so your analysis stays organized."
              action={{
                label: "New project",
                icon: Plus,
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }}
            />
          )
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id} className="flex">
                <div className="w-full">
                  <ProjectCard
                    project={project}
                    isOwner={project.isOwner}
                    canEdit={project.canEdit}
                    onEdit={openEdit}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 && (
          <nav
            className="flex items-center justify-between border-t border-border pt-4"
            aria-label="Pagination"
          >
            <p className="text-xs text-muted-foreground">
              Page {filters.page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => applyParams({ page: String(filters.page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= pageCount}
                onClick={() => applyParams({ page: String(filters.page + 1) })}
              >
                Next
              </Button>
            </div>
          </nav>
        )}
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        project={editing}
      />
    </>
  );
}
