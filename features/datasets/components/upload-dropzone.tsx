"use client";

import * as React from "react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  FileJson,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListPlus,
  FileUp,
  FileSearch,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  fileTypeFromExtension,
  type AcceptedFileType,
} from "@/features/datasets/schemas";

type SheetStatus = {
  name: string;
  state: "pending" | "importing" | "done" | "skipped";
  detail?: string;
};

type CreatedDataset = {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  sheetName: string | null;
};

type UploadState =
  | { status: "idle" }
  | { status: "selected"; file: File; fileType: AcceptedFileType }
  | { status: "uploading"; file: File; phase: string; sheetStatuses: SheetStatus[] }
  | { status: "success"; datasets: CreatedDataset[]; skipped: string[] }
  | { status: "error"; message: string };

const FILE_ICONS: Record<AcceptedFileType, React.ElementType> = {
  CSV: FileText,
  XLSX: FileSpreadsheet,
  JSON: FileJson,
};

const FILE_COLORS: Record<AcceptedFileType, string> = {
  CSV: "text-success-on-surface",
  XLSX: "text-info-on-surface",
  JSON: "text-warning-on-surface",
};

interface UploadDropzoneProps {
  projectId: string;
  onSuccess?: (datasetId: string) => void;
  className?: string;
}

export function UploadDropzone({ projectId, onSuccess, className }: UploadDropzoneProps) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0]?.message ?? "File rejected";
      setState({ status: "error", message: err });
      return;
    }
    const file = accepted[0];
    if (!file) return;

    const fileType = fileTypeFromExtension(file.name);
    if (!fileType) {
      setState({ status: "error", message: "Unsupported file type. Use CSV, XLSX, or JSON." });
      return;
    }

    // Auto-fill name from filename
    const autoName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
    setName(autoName);
    setState({ status: "selected", file, fileType });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_UPLOAD_BYTES,
    accept: {
      "text/csv": [".csv", ".tsv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"],
      "text/plain": [".txt", ".csv"],
    },
    multiple: false,
  });

  function patchSheet(name: string, patch: Partial<SheetStatus>) {
    setState((prev) => {
      if (prev.status !== "uploading") return prev;
      return {
        ...prev,
        sheetStatuses: prev.sheetStatuses.map((s) =>
          s.name === name ? { ...s, ...patch } : s
        ),
      };
    });
  }

  function handleProgressEvent(event: Record<string, unknown>) {
    switch (event.type) {
      case "reading":
        setState((prev) =>
          prev.status === "uploading"
            ? { ...prev, phase: "Reading workbook…" }
            : prev
        );
        break;
      case "sheets": {
        const sheets = Array.isArray(event.sheets)
          ? (event.sheets as string[]).map((s) => String(s))
          : [];
        setState((prev) =>
          prev.status === "uploading"
            ? {
                ...prev,
                phase: `Found ${sheets.length} worksheets`,
                sheetStatuses: sheets.map((s) => ({ name: s, state: "pending" })),
              }
            : prev
        );
        break;
      }
      case "sheet": {
        const sheet = String(event.name ?? "");
        patchSheet(sheet, { state: "importing" });
        setState((prev) =>
          prev.status === "uploading" ? { ...prev, phase: `Importing ${sheet}…` } : prev
        );
        break;
      }
      case "sheet-done": {
        const sheet = String(event.name ?? "");
        patchSheet(sheet, { state: "done" });
        break;
      }
      case "sheet-skipped": {
        const sheet = String(event.name ?? "");
        patchSheet(sheet, { state: "skipped", detail: String(event.reason ?? "") });
        break;
      }
      case "done": {
        const datasets = Array.isArray(event.datasets)
          ? (event.datasets as CreatedDataset[])
          : [];
        const skipped = Array.isArray(event.skipped)
          ? (event.skipped as string[]).map(String)
          : [];
        setState({ status: "success", datasets, skipped });
        onSuccess?.(datasets[0]?.id);
        break;
      }
      case "error":
        setState({ status: "error", message: String(event.message ?? "Upload failed.") });
        break;
    }
  }

  async function handleUpload() {
    if (state.status !== "selected") return;
    const { file } = state;

    setState({ status: "uploading", file, phase: "Uploading workbook…", sheetStatuses: [] });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("name", name.trim() || file.name);
    formData.append("description", description.trim());

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body.error ?? `Upload failed (HTTP ${res.status} ${res.statusText}).`;
        setState({ status: "error", message });
        return;
      }

      // NDJSON progress stream: parse line by line as it arrives.
      if (!res.body || !(res.headers.get("content-type") ?? "").includes("ndjson")) {
        setState({ status: "error", message: "Upload failed: unexpected server response." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            handleProgressEvent(JSON.parse(trimmed) as Record<string, unknown>);
          } catch {
            // Ignore malformed lines; the next valid event still applies.
          }
        }
      }
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  function reset() {
    setState({ status: "idle" });
    setName("");
    setDescription("");
  }

  return (
    <div className={cn("space-y-4", className)}>
      <AnimatePresence mode="wait">
        {/* ── Dropzone ──────────────────────────────────────── */}
        {(state.status === "idle" || state.status === "error") && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              )}
            >
              <input {...getInputProps()} />
              <div className="flex size-14 items-center justify-center rounded-xl gradient-brand shadow-lg">
                <Image
                  src="/logo-mark.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="size-10 object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-base font-semibold">
                  {isDragActive ? "Drop your file here" : "Drag & drop your file"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse — CSV, Excel, JSON up to{" "}
                  {formatBytes(MAX_UPLOAD_BYTES)}
                </p>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                {Object.keys(ACCEPTED_FILE_TYPES).map((t) => {
                  const Icon = FILE_ICONS[t as AcceptedFileType];
                  return (
                    <span key={t} className={cn("flex items-center gap-1", FILE_COLORS[t as AcceptedFileType])}>
                      <Icon className="size-3" />
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            {state.status === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive-on-surface"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{state.message}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── File selected ─────────────────────────────────── */}
        {state.status === "selected" && (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* File preview */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              {(() => {
                const Icon = FILE_ICONS[state.fileType];
                return <Icon className={cn("size-8 shrink-0", FILE_COLORS[state.fileType])} />;
              })()}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{state.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(state.file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset} className="shrink-0">
                <X className="size-4" />
              </Button>
            </div>

            {/* Name + description */}
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Dataset name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Q4 2024"
                  maxLength={120}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Description{" "}
                  <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the dataset…"
                  maxLength={500}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!name.trim()}
              variant="gradient"
              className="w-full"
            >
              <ListPlus className="size-4" />
              Upload dataset
            </Button>
          </motion.div>
        )}

        {/* ── Uploading / importing ─────────────────────────── */}
        {state.status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{state.phase}</p>
                <p className="text-xs text-muted-foreground">{state.file.name}</p>
              </div>
            </div>

            {state.sheetStatuses.length > 0 && (
              <ul className="space-y-1.5">
                {state.sheetStatuses.map((sheet) => (
                  <li
                    key={sheet.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    {sheet.state === "pending" && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                    )}
                    {sheet.state === "importing" && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                    )}
                    {sheet.state === "done" && (
                      <CheckCircle2 className="size-3.5 shrink-0 text-success-on-surface" />
                    )}
                    {sheet.state === "skipped" && (
                      <Ban className="size-3.5 shrink-0 text-warning-on-surface" />
                    )}
                    <span
                      className={cn(
                        "truncate",
                        sheet.state === "skipped" && "text-warning-on-surface",
                        sheet.state === "done" && "text-muted-foreground"
                      )}
                    >
                      {sheet.name}
                    </span>
                    {sheet.detail && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {sheet.detail}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="flex items-center gap-1 text-center text-xs text-muted-foreground">
              <FileSearch className="size-3" />
              Parsing rows, inferring column types, checking for duplicates…
            </p>
          </motion.div>
        )}

        {/* ── Success ───────────────────────────────────────── */}
        {state.status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-8 text-center"
          >
            <CheckCircle2 className="size-10 text-success-on-surface" />
            <div>
              <p className="text-base font-semibold">
                {state.datasets.length === 1
                  ? state.datasets[0].name
                  : `${state.datasets.length} datasets imported`}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.datasets.length === 1
                  ? `${state.datasets[0].rowCount.toLocaleString()} rows imported successfully`
                  : `Each worksheet is now its own dataset`}
              </p>
            </div>

            {state.datasets.length > 1 && (
              <ul className="w-full space-y-1 rounded-lg bg-background/60 p-3 text-left text-xs">
                {state.datasets.map((ds) => (
                  <li key={ds.id} className="flex items-center gap-2">
                    <FileUp className="size-3 shrink-0 text-primary" />
                    <span className="truncate font-medium">{ds.name}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground">
                      {ds.rowCount.toLocaleString()} rows · {ds.columnCount} cols
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {state.skipped.length > 0 && (
              <div className="w-full rounded-lg bg-warning/10 p-3 text-left text-xs text-warning-on-surface">
                <p className="font-medium">
                  {state.skipped.length} sheet{state.skipped.length === 1 ? "" : "s"} skipped
                </p>
                <ul className="mt-1 space-y-0.5">
                  {state.skipped.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button asChild variant="gradient" size="sm">
                <a href={`/dashboard/datasets/${state.datasets[0].id}`}>View dataset</a>
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                Upload another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
