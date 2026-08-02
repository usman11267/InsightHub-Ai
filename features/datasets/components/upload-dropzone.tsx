"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudUpload,
  FileSpreadsheet,
  FileJson,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListPlus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  fileTypeFromExtension,
  type AcceptedFileType,
} from "@/features/datasets/schemas";

type UploadState =
  | { status: "idle" }
  | { status: "selected"; file: File; fileType: AcceptedFileType }
  | { status: "sheets_selection"; file: File; sheets: string[] }
  | { status: "uploading"; file: File; progress: number; currentSheet?: string; totalSheets?: number; uploadedCount?: number }
  | { status: "success"; datasetId: string; name: string; rowCount: number; multiple?: boolean; uploadedCount?: number }
  | { status: "error"; message: string; duplicateId?: string };

const FILE_ICONS: Record<AcceptedFileType, React.ElementType> = {
  CSV: FileText,
  XLSX: FileSpreadsheet,
  JSON: FileJson,
};

const FILE_COLORS: Record<AcceptedFileType, string> = {
  CSV: "text-success",
  XLSX: "text-info",
  JSON: "text-warning",
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
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

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

  async function handleUpload() {
    if (state.status !== "selected") return;
    const { file } = state;

    setState({ status: "uploading", file, progress: 10 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("name", name.trim() || file.name);
    formData.append("description", description.trim());

    // Simulate progress increments during upload
    const progressInterval = setInterval(() => {
      setState((prev) =>
        prev.status === "uploading" && prev.progress < 85
          ? { ...prev, progress: prev.progress + 15 }
          : prev
      );
    }, 400);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      clearInterval(progressInterval);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setState({ status: "error", message: body.error, duplicateId: body.duplicateId });
        } else {
          setState({ status: "error", message: body.error ?? "Upload failed" });
        }
        return;
      }

      const data = await res.json();
      
      if (data.requireSelection) {
        setState({ status: "sheets_selection", file, sheets: data.sheets });
        setSelectedSheets(data.sheets);
        return;
      }

      setState({ status: "success", datasetId: data.id, name: data.name, rowCount: data.rowCount });
      onSuccess?.(data.id);
    } catch {
      clearInterval(progressInterval);
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  async function handleUploadSheets() {
    if (state.status !== "sheets_selection") return;
    const { file } = state;
    if (selectedSheets.length === 0) return;

    setState({ status: "uploading", file, progress: 10, totalSheets: selectedSheets.length, uploadedCount: 0 });

    let successCount = 0;
    let lastDatasetId = "";

    for (let i = 0; i < selectedSheets.length; i++) {
      const sheetName = selectedSheets[i];
      setState({ status: "uploading", file, progress: 10 + (i / selectedSheets.length) * 80, currentSheet: sheetName, totalSheets: selectedSheets.length, uploadedCount: successCount });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("name", name.trim() || file.name);
      formData.append("description", description.trim());
      formData.append("sheetName", sheetName);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          successCount++;
          lastDatasetId = data.id;
        }
      } catch (err) {
        console.error(`Failed to upload sheet ${sheetName}`, err);
      }
    }

    if (successCount === 0) {
      setState({ status: "error", message: "Failed to upload any sheets. Please try again." });
    } else {
      setState({ status: "success", datasetId: lastDatasetId, name: `${name} (${successCount} sheets)`, rowCount: 0, multiple: true, uploadedCount: successCount });
      onSuccess?.(lastDatasetId);
    }
  }

  function reset() {
    setState({ status: "idle" });
    setName("");
    setDescription("");
    setSelectedSheets([]);
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
                <CloudUpload className="size-7 text-white" />
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
                className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{state.message}</p>
                  {state.duplicateId && (
                    <a
                      href={`/dashboard/datasets/${state.duplicateId}`}
                      className="mt-1 underline underline-offset-2"
                    >
                      View existing dataset →
                    </a>
                  )}
                </div>
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
              <CloudUpload className="size-4" />
              Upload dataset
            </Button>
          </motion.div>
        )}

        {/* ── Sheets Selection ───────────────────────────────── */}
        {state.status === "sheets_selection" && (
          <motion.div
            key="sheets_selection"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <FileSpreadsheet className="size-8 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Multiple Sheets Found</p>
                <p className="text-xs text-muted-foreground">Select which sheets to import</p>
              </div>
              <Button variant="ghost" size="icon" onClick={reset} className="shrink-0">
                <X className="size-4" />
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-2 space-y-1 max-h-60 overflow-y-auto">
              {state.sheets.map((sheetName) => (
                <label
                  key={sheetName}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedSheets.includes(sheetName)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSheets((prev) => [...prev, sheetName]);
                      } else {
                        setSelectedSheets((prev) => prev.filter((s) => s !== sheetName));
                      }
                    }}
                  />
                  <span className="text-sm font-medium">{sheetName}</span>
                </label>
              ))}
            </div>

            <Button
              onClick={handleUploadSheets}
              disabled={selectedSheets.length === 0}
              variant="gradient"
              className="w-full"
            >
              <ListPlus className="size-4" />
              Import {selectedSheets.length} sheet{selectedSheets.length === 1 ? "" : "s"}
            </Button>
          </motion.div>
        )}

        {/* ── Uploading ─────────────────────────────────────── */}
        {state.status === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {state.totalSheets && state.totalSheets > 1 
                    ? `Uploading sheet ${state.uploadedCount! + 1} of ${state.totalSheets}…` 
                    : "Uploading & analyzing…"}
                </p>
                <p className="text-xs text-muted-foreground">{state.currentSheet ? `${state.file.name} - ${state.currentSheet}` : state.file.name}</p>
              </div>
            </div>
            <Progress value={state.progress} className="h-2" />
            <p className="text-center text-xs text-muted-foreground">
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
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="text-base font-semibold">{state.name}</p>
              <p className="text-sm text-muted-foreground">
                {state.multiple
                  ? `${state.uploadedCount} sheets imported successfully`
                  : `${state.rowCount.toLocaleString()} rows imported successfully`}
              </p>
            </div>
            <div className="flex gap-2">
              {!state.multiple && (
                <Button asChild variant="gradient" size="sm">
                  <a href={`/dashboard/datasets/${state.datasetId}`}>View dataset</a>
                </Button>
              )}
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
