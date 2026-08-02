"use client";

import * as React from "react";
import { useState } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateReport } from "@/features/reports/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ReportGeneratorDialogProps {
  projects: { id: string; name: string; color: string }[];
}

export function ReportGeneratorDialog({ projects }: ReportGeneratorDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ projectId: projects[0]?.id ?? "", title: "", context: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId || !form.title.trim()) return;

    setLoading(true);
    try {
      const result = await generateReport(form);
      if (result.success) {
        toast.success("Report generation started!");
        setOpen(false);
        router.push(`/dashboard/reports/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" id="new-report-btn">
          <Plus className="size-4" />
          New Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Generate AI Report
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Project *</label>
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Report title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Q4 Sales Analysis"
              maxLength={200}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Additional context <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={form.context}
              onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
              placeholder="Any specific focus areas, audience, or questions to answer…"
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={loading || !form.title.trim()}>
            {loading ? <><Loader2 className="size-4 animate-spin" /> Generating…</> : <><Sparkles className="size-4" /> Generate report</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
