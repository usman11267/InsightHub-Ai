"use client";

import * as React from "react";
import { useState } from "react";
import { Save, Sparkles, Loader2, BookOpen, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveQuery, deleteQuery, explainSQL } from "@/features/sql/actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type SavedQuery = {
  id: string;
  name: string;
  sql: string;
  description: string | null;
  createdAt: Date;
  project: { id: string; name: string; color: string };
};

interface SQLWorkspaceProps {
  savedQueries: SavedQuery[];
  projects: { id: string; name: string; color: string }[];
}

const EXAMPLE_SQL = `-- Example: count rows by category
SELECT category, COUNT(*) as count
FROM your_dataset
GROUP BY category
ORDER BY count DESC
LIMIT 10;`;

export function SQLWorkspace({ savedQueries: initialQueries, projects }: SQLWorkspaceProps) {
  const [sql, setSql] = useState(EXAMPLE_SQL);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState<"explain" | "save" | null>(null);
  const [queryName, setQueryName] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [queries, setQueries] = useState(initialQueries);
  const [showSavePanel, setShowSavePanel] = useState(false);

  async function handleExplain() {
    if (!sql.trim()) return;
    setLoading("explain");
    try {
      const res = await explainSQL(sql);
      if (res.success) setExplanation(res.data.explanation);
      else toast.error(res.error);
    } finally {
      setLoading(null);
    }
  }

  async function handleSave() {
    if (!queryName.trim() || !sql.trim() || !projectId) return;
    setLoading("save");
    try {
      const res = await saveQuery({ projectId, name: queryName, sql });
      if (res.success) {
        toast.success("Query saved!");
        setShowSavePanel(false);
        setQueryName("");
        // Refresh queries list
        window.location.reload();
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved query?")) return;
    const res = await deleteQuery({ id });
    if (res.success) {
      setQueries((q) => q.filter((query) => query.id !== id));
      toast.success("Query deleted");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Saved queries panel */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="size-4" />
            Saved Queries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] px-3 pb-3">
            {queries.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No saved queries yet.</p>
            ) : (
              <div className="space-y-1">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    className="group flex items-start justify-between gap-2 rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => setSql(q.sql)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{q.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <ChevronRight className="size-3 text-muted-foreground" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                        className="hidden group-hover:block text-destructive-on-surface hover:text-destructive-on-surface/80"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Editor + results */}
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">SQL Editor</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExplain}
                  disabled={!!loading || !sql.trim()}
                >
                  {loading === "explain" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  Explain
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSavePanel(!showSavePanel)}
                  disabled={!sql.trim()}
                >
                  <Save className="size-3.5" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Editor */}
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-input bg-muted/30 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              style={{ minHeight: 200, maxHeight: 400 }}
              placeholder="Write your SQL here…"
            />

            {/* Save panel */}
            {showSavePanel && (
              <div className="flex gap-2">
                <input
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="Query name…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <Button variant="gradient" size="sm" onClick={handleSave} disabled={!queryName.trim() || loading === "save"}>
                  {loading === "save" ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Explanation */}
        {explanation && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="size-4" />
                AI Explanation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Info card */}
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              💡 <strong>SQL Workspace</strong> saves and organizes your queries. Use the{" "}
              <strong>Explain</strong> button to get an AI explanation of any query. Full query execution against uploaded datasets requires a database connection configured in your project settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
