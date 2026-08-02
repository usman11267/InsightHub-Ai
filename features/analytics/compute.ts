/**
 * Client-side statistical computation engine.
 * Operates on the preview rows stored in previewJson (up to 100 rows).
 * For the full dataset, the AI models operate on schema + aggregates.
 */

type Row = Record<string, unknown>;
type NumericColumn = { name: string; values: number[] };

export function getNumericColumns(rows: Row[]): NumericColumn[] {
  if (!rows.length) return [];
  const columns = Object.keys(rows[0]);
  return columns
    .map((name) => {
      const values = rows
        .map((r) => Number(r[name]))
        .filter((v) => !isNaN(v) && isFinite(v));
      return { name, values };
    })
    .filter((c) => c.values.length > 0);
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mode(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let maxCount = 0;
  let modeVal = values[0];
  for (const [v, c] of freq) {
    if (c > maxCount) { maxCount = c; modeVal = v; }
  }
  return modeVal;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

export function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

export function min(values: number[]): number {
  return Math.min(...values);
}

export function max(values: number[]): number {
  return Math.max(...values);
}

/** IQR-based outlier detection. Returns indices of outlier rows. */
export function detectOutliers(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v < lo || v > hi)
    .map(({ i }) => i);
}

/** Value frequency for categorical columns (top 10). */
export function topCategories(
  rows: Row[],
  colName: string,
  topN = 10
): { value: string; count: number; pct: number }[] {
  const freq = new Map<string, number>();
  for (const row of rows) {
    const v = String(row[colName] ?? "null");
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([value, count]) => ({ value, count, pct: (count / rows.length) * 100 }));
}

/** Pearson correlation between two columns (-1 to 1). */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const ai = a[i] - ma;
    const bi = b[i] - mb;
    num += ai * bi;
    da += ai * ai;
    db += bi * bi;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

export type KPI = {
  label: string;
  value: string;
  subLabel?: string;
  trend?: "up" | "down" | "neutral";
  accent: "primary" | "success" | "warning" | "info";
};

export function computeKPIs(rows: Row[], schema: { name: string; inferredType: string }[]): KPI[] {
  const kpis: KPI[] = [];
  const numCols = getNumericColumns(rows);

  // Total rows
  kpis.push({ label: "Total records", value: rows.length.toLocaleString(), accent: "primary" });

  // Per numeric column: sum, mean
  for (const col of numCols.slice(0, 3)) {
    const s = sum(col.values);
    const m = mean(col.values);
    kpis.push({
      label: `Total ${col.name}`,
      value: s > 1_000_000 ? `${(s / 1_000_000).toFixed(1)}M` : s > 1_000 ? `${(s / 1_000).toFixed(1)}K` : s.toFixed(0),
      subLabel: `Avg: ${m.toFixed(2)}`,
      accent: "success",
    });
  }

  // Completeness
  const totalCells = rows.length * schema.length;
  const nullCells = rows.reduce(
    (acc, row) =>
      acc + Object.values(row).filter((v) => v === null || v === "" || v === undefined).length,
    0
  );
  const completeness = totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 100;
  kpis.push({
    label: "Data completeness",
    value: `${completeness.toFixed(1)}%`,
    trend: completeness > 95 ? "up" : completeness > 80 ? "neutral" : "down",
    accent: completeness > 95 ? "success" : completeness > 80 ? "warning" : "info",
  });

  // Unique rate for first string column
  const strCols = schema.filter((c) => c.inferredType === "string");
  if (strCols.length > 0) {
    const col = strCols[0].name;
    const unique = new Set(rows.map((r) => String(r[col] ?? ""))).size;
    kpis.push({
      label: `Unique ${col}`,
      value: unique.toLocaleString(),
      subLabel: `of ${rows.length}`,
      accent: "info",
    });
  }

  return kpis;
}
