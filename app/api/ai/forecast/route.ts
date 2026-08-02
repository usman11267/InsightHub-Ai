import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ask, GROQ_MODEL } from "@/lib/gemini";
import {
  getNumericColumns,
  mean,
} from "@/features/analytics/compute";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getCurrentDbUser();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const rl = rateLimit(`forecast:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const { datasetId, periods = 3 } = await req.json();

  const dataset = await prisma.dataset.findFirst({
    where: {
      id: datasetId,
      status: "READY",
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
    select: { name: true, rowCount: true, schemaJson: true, previewJson: true },
  });

  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const rows = (dataset.previewJson as Record<string, unknown>[]) ?? [];
  const numCols = getNumericColumns(rows);

  if (numCols.length === 0) {
    return NextResponse.json({ error: "No numeric columns found for forecasting" }, { status: 422 });
  }

  // Build data summary for AI
  const colSummary = numCols
    .slice(0, 3)
    .map((c) => {
      const m = mean(c.values);
      const last = c.values[c.values.length - 1];
      const first = c.values[0];
      const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
      return `  "${c.name}": mean=${m.toFixed(2)}, first=${first}, last=${last}, trend=${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
    })
    .join("\n");

  const prompt = `You are a data scientist. Analyze the following dataset summary and generate a ${periods}-period forecast.

Dataset: "${dataset.name}" (${dataset.rowCount} rows)
Numeric column statistics (from ${rows.length} sample rows):
${colSummary}

TASK: Generate a JSON forecast response in EXACTLY this format (no other text):
{
  "summary": "2-3 sentence professional forecast narrative explaining the key trends and predictions",
  "trend": "up" | "down" | "stable",
  "confidence": <integer 0-100>,
  "growthRate": <number or null — estimated % change per period>,
  "forecastPoints": [
    { "label": "Period 1", "value": <number>, "isForecast": false },
    ...historical points...,
    { "label": "Forecast +1", "value": <number>, "isForecast": true },
    ...${periods} forecast points...
  ]
}

Base the historical points on the actual ${Math.min(rows.length, 8)} sample values for the primary numeric column.
The forecast points should be labeled "Forecast +1", "Forecast +2", etc.
Be realistic — base confidence on data quality and trend consistency.
Return ONLY valid JSON, no markdown fencing.`;

  try {
    const raw = await ask(prompt, undefined, GROQ_MODEL, 2048);

    // Parse — strip any accidental markdown fencing
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Please try again." }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forecast failed" },
      { status: 500 }
    );
  }
}
