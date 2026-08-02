"use client";

import * as React from "react";
import { UploadDropzone } from "@/features/datasets/components/upload-dropzone";

/**
 * Owns the project selection so the dropzone uploads to the project the user
 * actually picked. Previously the <select> was uncontrolled and its value was
 * never read, so every upload silently targeted the first project.
 */
export function UploadPanel({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [projectId, setProjectId] = React.useState(projects[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="upload-project-select"
          className="mb-1.5 block text-sm font-medium"
        >
          Project
        </label>
        <select
          id="upload-project-select"
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

      {/* Remount on project change so a part-completed upload can't be
          submitted against the newly selected project. */}
      <UploadDropzone key={projectId} projectId={projectId} />
    </div>
  );
}
