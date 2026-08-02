import "server-only";
import Groq from "groq-sdk";

/**
 * InsightHub AI — Groq client
 *
 * Groq provides free, ultra-fast inference on open-source models via
 * the OpenAI-compatible API. We use llama-3.3-70b-versatile as the
 * primary model (reasoning quality) and llama-3.1-8b-instant as the
 * fast model (chat, short completions).
 *
 * Get a free API key at: https://console.groq.com
 * Set GROQ_API_KEY in your .env file.
 */

// ─── Model constants ───────────────────────────────────────────────────────
/** Primary heavy model — Mixtral 8x7B MoE (32k context, high reasoning). */
export const GROQ_MODEL = "mixtral-8x7b-32768";

/** Fast interactive model — Mixtral 8x7B MoE. */
export const GROQ_MODEL_FAST = "mixtral-8x7b-32768";

/** Mixtral 8x7B MoE model — 32,768 token context window. */
export const GROQ_MODEL_MIXTRAL = "mixtral-8x7b-32768";

// ─── Singleton client ──────────────────────────────────────────────────────
let _client: Groq | null | undefined = undefined;

function getClient(): Groq | null {
  if (_client === undefined) {
    const key = process.env.GROQ_API_KEY;
    _client = key ? new Groq({ apiKey: key }) : null;
  }
  return _client;
}

/**
 * Returns the Groq client.
 * Throws a clear, actionable error when the API key is missing.
 */
export function getGroqClient(): Groq {
  const client = getClient();
  if (!client) {
    throw new Error(
      "GROQ_API_KEY is not configured. " +
        "Get a free key at https://console.groq.com and add it to your .env file."
    );
  }
  return client;
}

/** True when Groq is configured and ready to use. */
export function isAIConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

// ─── Core helpers ──────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Generate a single text completion (non-streaming).
 *
 * Use for: report generation, data profiling, SQL explanation, one-shot analysis.
 *
 * @param messages  - Full conversation history (system + user turns).
 * @param modelId   - Defaults to GROQ_MODEL (70b). Pass GROQ_MODEL_FAST for speed.
 * @param maxTokens - Hard ceiling on response length (default 4096).
 */
export async function generateText(
  messages: ChatMessage[],
  modelId: string = GROQ_MODEL,
  maxTokens = 4096
): Promise<string> {
  const client = getGroqClient();

  const completion = await client.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: maxTokens,
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Convenience wrapper: single user prompt with an optional system instruction.
 *
 * @example
 *   const text = await ask("Summarize this dataset", "You are a data analyst.");
 */
export async function ask(
  userPrompt: string,
  systemPrompt?: string,
  modelId: string = GROQ_MODEL,
  maxTokens = 4096
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });
  return generateText(messages, modelId, maxTokens);
}

/**
 * Stream a chat completion. Yields text deltas as they arrive.
 * Use for the AI Assistant chat panel to get real-time responses.
 *
 * @example
 *   for await (const chunk of streamChat(messages)) {
 *     process.stdout.write(chunk);
 *   }
 */
export async function* streamChat(
  messages: ChatMessage[],
  modelId: string = GROQ_MODEL_FAST,
  maxTokens = 2048
): AsyncGenerator<string> {
  const client = getGroqClient();

  const stream = await client.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: maxTokens,
    temperature: 0.5,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ─── Prompt builders ───────────────────────────────────────────────────────

/**
 * Build the system prompt for the AI Data Assistant.
 * Injects dataset schema and preview rows so the model understands the data.
 */
export function buildDatasetSystemPrompt(opts: {
  datasetName: string;
  rowCount: number;
  columnCount: number;
  schema: Array<{ name: string; inferredType: string; missingCount: number; uniqueCount: number }>;
  previewRows: Record<string, unknown>[];
}): string {
  const schemaText = opts.schema
    .map(
      (c) =>
        `  - "${c.name}": ${c.inferredType}, ${c.uniqueCount} unique values, ${c.missingCount} missing`
    )
    .join("\n");

  const previewText = JSON.stringify(opts.previewRows.slice(0, 5), null, 2);

  return `You are InsightHub AI, an expert data analyst assistant embedded in a SaaS analytics platform.

The user has loaded the dataset "${opts.datasetName}" which has ${opts.rowCount.toLocaleString()} rows and ${opts.columnCount} columns.

COLUMN SCHEMA:
${schemaText}

SAMPLE DATA (first 5 rows):
${previewText}

CAPABILITIES:
- Summarize the dataset: describe its content, completeness, and key variables.
- Identify trends, patterns, anomalies, and outliers in the data.
- Generate KPIs: compute or estimate totals, averages, growth rates, top categories.
- Suggest charts: recommend the most insightful visualizations for this data.
- Answer questions: the user may ask specific questions about columns or values.
- Predict: make reasonable forecast statements based on visible patterns.
- Explain charts: describe what a chart shows in plain language.
- Clean data: suggest which cleaning operations would improve this dataset.

GUIDELINES:
- Be concise and precise. Lead with the most important insight.
- When quoting numbers, always specify units and context.
- If the user's question cannot be answered from the sample data, say so clearly.
- Format responses in clean markdown with headers where appropriate.
- Never hallucinate data that isn't in the schema or sample.`;
}

/**
 * Build the prompt for generating an AI report from a dataset.
 */
export function buildReportPrompt(opts: {
  datasetName: string;
  rowCount: number;
  schema: Array<{ name: string; inferredType: string }>;
  previewRows: Record<string, unknown>[];
  additionalContext?: string;
}): string {
  const schemaText = opts.schema.map((c) => `${c.name} (${c.inferredType})`).join(", ");
  const previewText = JSON.stringify(opts.previewRows.slice(0, 10), null, 2);

  return `Generate a comprehensive professional data analysis report for the dataset "${opts.datasetName}".

Dataset: ${opts.rowCount.toLocaleString()} rows | Columns: ${schemaText}

Sample data:
${previewText}

${opts.additionalContext ? `Additional context: ${opts.additionalContext}` : ""}

Generate a structured report with the following sections. Use markdown formatting.

## Executive Summary
2-3 sentences summarizing what this dataset represents and its most important finding.

## Key Insights
5-7 bullet points, each with a specific, quantified insight from the data.

## Trends & Patterns
Describe 2-4 notable trends visible in the data (time series if applicable, otherwise distributional patterns).

## Data Quality
Note completeness, missing values, outliers, or data quality issues that analysts should be aware of.

## Recommendations
3-5 actionable recommendations based on the data findings.

## Predictions
1-3 short-term predictions or forecasts, clearly labeled as estimates.

Be specific, data-driven, and avoid generic statements. Each bullet point should reference actual column names and estimated values from the sample.`;
}

/**
 * Build the prompt for explaining a SQL query.
 */
export function buildSQLExplainPrompt(sql: string): string {
  return `Explain the following SQL query in plain English. Be concise (3-5 sentences max).
First give a one-line summary, then explain what each major clause does.
End with what the output will look like (columns returned, row count estimate if possible).

SQL:
\`\`\`sql
${sql.trim()}
\`\`\``;
}

/**
 * Build the prompt for AI-powered data cleaning suggestions.
 */
export function buildCleaningPrompt(opts: {
  datasetName: string;
  schema: Array<{ name: string; inferredType: string; missingCount: number; uniqueCount: number }>;
  previewRows: Record<string, unknown>[];
}): string {
  const schemaText = opts.schema
    .map((c) => `  ${c.name} (${c.inferredType}): ${c.missingCount} missing, ${c.uniqueCount} unique`)
    .join("\n");

  return `Analyze this dataset and suggest data cleaning operations.

Dataset: "${opts.datasetName}"
Schema:
${schemaText}

Sample: ${JSON.stringify(opts.previewRows.slice(0, 5), null, 2)}

Respond with a JSON array of cleaning suggestions in this exact format:
[
  {
    "operation": "fill_missing" | "remove_duplicates" | "normalize_text" | "fix_dates" | "cast_type" | "rename_column",
    "column": "column_name_or_null",
    "reason": "Why this is needed",
    "priority": "high" | "medium" | "low",
    "estimatedImpact": "e.g. fixes 45 missing values"
  }
]

Return ONLY the JSON array, no other text.`;
}
