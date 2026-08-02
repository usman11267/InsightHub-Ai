export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface ChatContext {
  datasetId?: string;
  datasetName?: string;
}

export type QuickPrompt = {
  label: string;
  prompt: string;
  icon: string;
};

export const QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Summarize dataset", prompt: "Give me a comprehensive summary of this dataset — what it contains, its key variables, data quality, and the most interesting patterns.", icon: "📋" },
  { label: "Find anomalies", prompt: "Identify any anomalies, outliers, or unusual values in this dataset. For each, explain why it's unusual and what it might indicate.", icon: "🔍" },
  { label: "Generate KPIs", prompt: "Based on this dataset, what are the most meaningful KPIs I should track? Provide estimates or calculations where possible.", icon: "📊" },
  { label: "Show sales trend", prompt: "Analyze the sales or revenue trend in this dataset. Is it growing, declining, or stable? What's the growth rate?", icon: "📈" },
  { label: "Suggest charts", prompt: "What are the 3 most insightful charts I should create for this dataset? Describe what each chart should show and why.", icon: "🎨" },
  { label: "Predict next month", prompt: "Based on the patterns in this data, what would you predict for next month? Give a specific estimate with reasoning.", icon: "🔮" },
  { label: "Clean my data", prompt: "What data quality issues does this dataset have? List specific cleaning steps I should take, in priority order.", icon: "🧹" },
  { label: "Explain this data", prompt: "In plain English, what story does this dataset tell? Explain it as if presenting to a non-technical executive.", icon: "💡" },
];
