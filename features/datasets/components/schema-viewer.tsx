import * as React from "react";
import { cn } from "@/lib/utils";

export type InferredType = "string" | "number" | "boolean" | "date" | "mixed";

export interface ColumnInfo {
  name: string;
  inferredType: InferredType;
  missingCount: number;
  uniqueCount: number;
}

interface SchemaViewerProps {
  schema: ColumnInfo[];
  rowCount: number;
}

const TYPE_COLORS: Record<InferredType, string> = {
  number: "bg-info/10 text-info border-info/20",
  string: "bg-primary/10 text-primary border-primary/20",
  boolean: "bg-success/10 text-success border-success/20",
  date: "bg-warning/10 text-warning border-warning/20",
  mixed: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<InferredType, string> = {
  number: "Number",
  string: "Text",
  boolean: "Boolean",
  date: "Date",
  mixed: "Mixed",
};

export function SchemaViewer({ schema, rowCount }: SchemaViewerProps) {
  if (!schema.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No schema available.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {schema.length} columns · {rowCount.toLocaleString()} rows
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {["Column", "Type", "Completeness", "Unique values"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schema.map((col, i) => {
              const completeness = rowCount > 0 ? ((rowCount - col.missingCount) / rowCount) * 100 : 100;
              return (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs font-medium">{col.name}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        TYPE_COLORS[col.inferredType]
                      )}
                    >
                      {TYPE_LABELS[col.inferredType]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            completeness === 100
                              ? "bg-success"
                              : completeness >= 80
                              ? "bg-warning"
                              : "bg-destructive"
                          )}
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {completeness.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {col.uniqueCount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
