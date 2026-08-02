"use client";

import * as React from "react";
import { useState } from "react";
import { Share2, Copy, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleShareLink, deleteReport } from "@/features/reports/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ReportActionsProps {
  reportId: string;
  shareSlug: string | null;
}

export function ReportActions({ reportId, shareSlug: initialSlug }: ReportActionsProps) {
  const router = useRouter();
  const [shareSlug, setShareSlug] = useState(initialSlug);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggleShare() {
    setToggling(true);
    try {
      const result = await toggleShareLink({ id: reportId });
      if (result.success) {
        setShareSlug(result.data.shareSlug);
        toast.success(result.data.shareSlug ? "Share link enabled" : "Share link disabled");
      } else {
        toast.error(result.error);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const result = await deleteReport({ id: reportId });
      if (result.success) {
        toast.success("Report deleted");
        router.push("/dashboard/reports");
      } else {
        toast.error(result.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  function copyLink() {
    if (!shareSlug) return;
    const url = `${window.location.origin}/r/${shareSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      {shareSlug && (
        <Button variant="outline" size="sm" onClick={copyLink}>
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy link"}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleShare}
        disabled={toggling}
        id="toggle-share-btn"
      >
        {toggling ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
        {shareSlug ? "Disable share" : "Share"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="text-destructive hover:text-destructive"
        id="delete-report-btn"
      >
        {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </Button>
    </div>
  );
}
