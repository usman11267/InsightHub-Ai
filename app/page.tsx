import Link from "next/link";
import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Database,
  FileText,
  LineChart,
  Lock,
  Sparkles,
  Table2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const FEATURES = [
  {
    icon: Database,
    title: "Upload anything",
    body: "CSV, Excel, or JSON. Schema and column types are inferred on upload, duplicates caught by checksum.",
  },
  {
    icon: Bot,
    title: "Ask in plain English",
    body: "\"Show the sales trend\" or \"find anomalies\". The assistant reads your actual dataset, not a generic prompt.",
  },
  {
    icon: BarChart3,
    title: "Eleven chart types",
    body: "Bar, line, area, scatter, pie, radar, heatmap, treemap and more. Customize colors and export as PNG or SVG.",
  },
  {
    icon: FileText,
    title: "Reports that write themselves",
    body: "Executive summary, key insights, trends, and recommendations — exported to PDF, DOCX, or Markdown.",
  },
  {
    icon: TrendingUp,
    title: "Forecasting",
    body: "Project sales, demand, and growth forward with confidence intervals you can actually defend.",
  },
  {
    icon: Table2,
    title: "SQL workspace",
    body: "Query your datasets directly. Save what works, and let AI explain any query you inherit.",
  },
  {
    icon: Users,
    title: "Built for teams",
    body: "Admin, editor, and viewer roles per project. Every meaningful action lands in the audit log.",
  },
  {
    icon: Lock,
    title: "Secure by default",
    body: "Role-based access, server-side validation, rate limiting, and signed upload URLs on every request.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg gradient-brand shadow-sm">
              <Sparkles className="size-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">InsightHub AI</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Show
              when="signed-out"
              fallback={
                <Button asChild variant="gradient" size="sm">
                  <Link href="/dashboard">
                    Dashboard
                    <ArrowRight />
                  </Link>
                </Button>
              }
            >
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="gradient" size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </Show>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambient glow — decorative only */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <Badge variant="outline" className="mb-6 gap-1.5 py-1">
              <Zap className="size-3 text-primary" />
              Powered by Gemini
            </Badge>

            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              <span className="text-gradient-brand">Stop staring at spreadsheets.</span>
              <br />
              Start getting answers.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Upload a dataset and InsightHub AI does the rest — KPIs, charts, anomaly
              detection, forecasts, and a written report your leadership will actually read.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Show
                when="signed-out"
                fallback={
                  <Button asChild size="lg" variant="gradient">
                    <Link href="/dashboard">
                      Open dashboard
                      <ArrowRight />
                    </Link>
                  </Button>
                }
              >
                <Button asChild size="lg" variant="gradient">
                  <Link href="/sign-up">
                    Start for free
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </Show>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free tier includes 3 projects
            </p>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything between raw data and a decision
            </h2>
            <p className="mt-3 text-muted-foreground">
              One workspace instead of a spreadsheet, a BI tool, and a deck.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} interactive className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ───────────────────────────────────── */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <LineChart className="mx-auto size-8 text-primary" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              Your first insight is four minutes away
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Create a project, drop in a CSV, and ask the assistant what it sees.
            </p>
            <Button asChild size="lg" variant="gradient" className="mt-8">
              <Link href="/sign-up">
                Get started free
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} InsightHub AI</p>
          <p>Built with Next.js, Prisma, and Gemini</p>
        </div>
      </footer>
    </div>
  );
}
