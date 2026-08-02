"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatasetFiltersProps {
  projects: { id: string; name: string; color: string }[];
  totalCount: number;
}

export function DatasetFilters({ projects, totalCount }: DatasetFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const fileType = searchParams.get("fileType") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const sort = searchParams.get("sort") ?? "recent";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = q || projectId || fileType !== "ALL" || status !== "ALL";

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left — search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            defaultValue={q}
            placeholder="Search datasets…"
            onChange={(e) => {
              const value = e.target.value;
              clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__ds_search);
              (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__ds_search = setTimeout(
                () => updateParam("q", value),
                350
              );
            }}
            className="h-9 w-56 rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Project filter */}
        {projects.length > 1 && (
          <Select value={projectId || "ALL"} onValueChange={(v) => updateParam("projectId", v)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* File type */}
        <Select value={fileType} onValueChange={(v) => updateParam("fileType", v)}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="CSV">CSV</SelectItem>
            <SelectItem value="XLSX">Excel</SelectItem>
            <SelectItem value="JSON">JSON</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="READY">Ready</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 text-muted-foreground">
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Right — sort + count */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} dataset{totalCount !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
            <SelectTrigger className="h-9 w-32 border-0 bg-transparent shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="size">Largest first</SelectItem>
              <SelectItem value="rows">Most rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
