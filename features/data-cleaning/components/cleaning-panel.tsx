"use client";

import * as React from "react";
import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runCleaningOperation } from "@/features/data-cleaning/actions";
import type { ColumnInfo } from "@/features/datasets/components/schema-viewer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Operation =
  | "remove_duplicates"
  | "trim_whitespace"
  | "normalize_text"
  | "fill_missing_mean"
  | "fill_missing_median"
  | "fill_missing_mode";

const WHOLE_TABLE_OPS: { op: Operation; label: string; description: string }[] = [
  {
    op: "remove_duplicates",
    label: "Remove duplicate rows",
    description: "Drops rows whose every column matches an earlier row.",
  },
  {
    op: "trim_whitespace",
    label: "Trim whitespace",
    description: "Strips leading and trailing spaces from every text cell.",
  },
  {
    op: "normalize_text",
    label: "Normalize text casing",
    description: "Collapses inconsistent casing across text columns.",
  },
];

const FILL_OPS: { op: Operation; label: string }[] = [
  { op: "fill_missing_mean", label: "mean" },
  { op: "fill_missing_median", label: "median" },
  { op: "fill_missing_mode", label: "mode" },
];

interface CleaningPanelProps {
  datasetId: string;
  schema: ColumnInfo[];
  canEdit: boolean;
}

export function CleaningPanel({ datasetId, schema, canEdit }: CleaningPanelProps) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState("");
  const [column, setColumn] = useState(
    schema.find((c) => c.inferredType === "number")?.name ?? ""
  );

  const numericColumns = schema.filter((c) => c.inferredType === "number");

  async function run(operation: Operation | "ai_suggestions", targetColumn?: string) {
    setRunning(targetColumn ? `${operation}:${targetColumn}` : operation);
    try {
      const result = await runCleaningOperation({ datasetId, operation, column: targetColumn });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data.suggestions) {
        setSuggestions(result.data.suggestions);
      } else {
        toast.success(result.data.description);
        router.refresh();
      }
    } finally {
      setRunning(null);
    }
  }

  if (!canEdit) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        You need edit access on this project to clean its data.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {WHOLE_TABLE_OPS.map(({ op, label, description }) => (
          <Card key={op} className="rounded-xl">
            <CardContent className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => run(op)}
                disabled={!!running}
              >
                {running === op ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                Run
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {numericColumns.length > 0 && (
        <Card className="rounded-xl">
          <CardContent className="space-y-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Fill missing values</p>
              <p className="text-xs text-muted-foreground">
                Replaces empty cells in one numeric column with a computed value.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {numericColumns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.missingCount} missing)
                  </option>
                ))}
              </select>
              {FILL_OPS.map(({ op, label }) => (
                <Button
                  key={op}
                  variant="outline"
                  size="sm"
                  onClick={() => run(op, column)}
                  disabled={!!running || !column}
                >
                  {running === `${op}:${column}` ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Fill with {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">AI cleaning suggestions</p>
              <p className="text-xs text-muted-foreground">
                Reviews the schema and preview rows, then recommends what to fix.
              </p>
            </div>
            <Button
              variant="gradient"
              size="sm"
              className="shrink-0"
              onClick={() => run("ai_suggestions")}
              disabled={!!running}
            >
              {running === "ai_suggestions" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Suggest
            </Button>
          </div>
          {suggestions && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{suggestions}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
