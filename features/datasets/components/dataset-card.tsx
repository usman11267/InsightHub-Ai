"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  FileSpreadsheet,
  FileJson,
  MoreHorizontal,
  Trash2,
  Pencil,
  RotateCcw,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DatasetListItem } from "@/features/datasets/queries";

const FILE_ICONS = {
  CSV: FileText,
  XLSX: FileSpreadsheet,
  JSON: FileJson,
} as const;

const FILE_COLORS = {
  CSV: "text-success-on-surface bg-success/10",
  XLSX: "text-info-on-surface bg-info/10",
  JSON: "text-warning-on-surface bg-warning/10",
} as const;

const STATUS_BADGE = {
  READY: { label: "Ready", icon: CheckCircle2, class: "bg-success/10 text-success-on-surface border-success/20" },
  PROCESSING: { label: "Processing", icon: Loader2, class: "bg-warning/10 text-warning-on-surface border-warning/20" },
  ERROR: { label: "Error", icon: AlertCircle, class: "bg-destructive/10 text-destructive-on-surface border-destructive/20" },
} as const;

interface DatasetCardProps {
  dataset: DatasetListItem;
  onDelete?: (id: string) => void;
  onEdit?: (dataset: DatasetListItem) => void;
}

export function DatasetCard({ dataset, onDelete, onEdit }: DatasetCardProps) {
  const Icon = FILE_ICONS[dataset.fileType];
  const iconColors = FILE_COLORS[dataset.fileType];
  const status = STATUS_BADGE[dataset.status];
  const StatusIcon = status.icon;

  return (
    <Card interactive className="group relative flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", iconColors)}>
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/datasets/${dataset.id}`}
            className="block truncate text-sm font-semibold hover:text-primary transition-colors"
          >
            {dataset.name}
          </Link>
          {dataset.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{dataset.description}</p>
          )}
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Dataset actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/datasets/${dataset.id}`}>
                <Eye className="size-3.5" /> View
              </Link>
            </DropdownMenuItem>
            {dataset.canEdit && (
              <DropdownMenuItem onClick={() => onEdit?.(dataset)}>
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
            )}
            {dataset.canEdit && (
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/datasets/${dataset.id}?tab=versions`}>
                  <RotateCcw className="size-3.5" /> Versions
                </Link>
              </DropdownMenuItem>
            )}
            {dataset.canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive-on-surface focus:text-destructive-on-surface"
                  onClick={() => onDelete?.(dataset.id)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Rows", value: formatNumber(dataset.rowCount) },
          { label: "Cols", value: formatNumber(dataset.columnCount) },
          { label: "Size", value: formatBytes(dataset.fileSize) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/50 px-2 py-1.5">
            <p className="text-xs font-semibold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              status.class
            )}
          >
            <StatusIcon
              className={cn("size-2.5", dataset.status === "PROCESSING" && "animate-spin")}
            />
            {status.label}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
            {dataset.fileType}
          </Badge>
        </div>

        <span title={new Date(dataset.createdAt).toLocaleString()}>
          {formatDistanceToNow(new Date(dataset.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Project pill */}
      <div
        className="absolute left-0 top-0 h-full w-0.5 rounded-l-2xl"
        style={{ background: dataset.project.color }}
      />
    </Card>
  );
}
