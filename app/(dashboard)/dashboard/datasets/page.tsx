import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Database } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { listDatasets, getDatasetStats } from "@/features/datasets/queries";
import { getProjectOptions } from "@/features/projects/queries";
import { datasetFiltersSchema } from "@/features/datasets/schemas";
import { DatasetCard } from "@/features/datasets/components/dataset-card";
import { DatasetFilters } from "@/features/datasets/components/dataset-filters";
import { UploadDropzone } from "@/features/datasets/components/upload-dropzone";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBytes, formatNumber } from "@/lib/utils";
import { HardDrive, CheckCircle2, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Datasets",
  description: "Upload, manage, and explore your data files.",
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function DatasetsPage({ searchParams }: PageProps) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const rawParams = await searchParams;
  const filters = datasetFiltersSchema.parse(rawParams);
  const showUpload = rawParams.upload === "1";

  const [{ items, total, pageCount }, stats, projects] = await Promise.all([
    listDatasets(user.id, filters),
    getDatasetStats(user.id),
    getProjectOptions(user.id),
  ]);

  const defaultProjectId = projects[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Datasets"
          description="Upload, explore, and manage your data files."
        />
        <Dialog defaultOpen={showUpload}>
          <DialogTrigger asChild>
            <Button variant="gradient" id="upload-dataset-btn">
              <Plus className="size-4" />
              Upload dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload dataset</DialogTitle>
            </DialogHeader>
            {projects.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Create a project first before uploading datasets.
                <br />
                <Button asChild variant="gradient" size="sm" className="mt-3">
                  <Link href="/dashboard/projects?new=1">New project</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project selector */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Project</label>
                  <select
                    id="upload-project-select"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={defaultProjectId}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <UploadDropzone projectId={defaultProjectId} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total datasets" value={formatNumber(stats.total)} icon={Database} accent="primary" />
        <StatCard label="Ready" value={formatNumber(stats.ready)} icon={CheckCircle2} accent="success" />
        <StatCard label="Processing" value={formatNumber(stats.processing)} icon={Layers} accent="warning" />
        <StatCard label="Storage used" value={formatBytes(stats.totalBytes)} icon={HardDrive} accent="info" hint={`${formatNumber(stats.totalRows)} total rows`} />
      </div>

      {/* Filters */}
      <Suspense>
        <DatasetFilters projects={projects} totalCount={total} />
      </Suspense>

      {/* Grid */}
      {items.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No datasets found"
          description={
            total === 0
              ? "Upload your first dataset to start analyzing data."
              : "No datasets match your current filters."
          }
          action={
            total === 0
              ? { label: "Upload dataset", href: "/dashboard/datasets?upload=1", icon: Plus }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((dataset: any) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?${new URLSearchParams({ ...rawParams, page: String(p) })}`}
              className={`flex size-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                p === filters.page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent"
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
