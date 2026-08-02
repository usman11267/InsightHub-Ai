import Link from "next/link";
import Image from "next/image";
import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  Table2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const STATS = [
  { label: "Daily Queries Handled", value: "20,000+", change: "Scales effortlessly across edge clusters" },
  { label: "Global Edge Latency", value: "< 80ms", change: "Powered by Next.js 16 Edge CDN" },
  { label: "AI Forecast Accuracy", value: "99.4%", change: "Statistical & AI regression models" },
  { label: "Report Generation Time", value: "1.2s", change: "Automated executive summary generation" },
];

const BENTO_FEATURES = [
  {
    icon: Database,
    badge: "Smart Ingestion",
    title: "Universal Data Parser",
    description:
      "Instant schema inference for CSV, XLSX, and JSON files. Automatic column detection, checksum deduplication, and zero-loss type casting.",
    gradient: "from-primary/8 via-primary/4 to-transparent",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    icon: Bot,
    badge: "Gemini 2.5 Flash",
    title: "Context-Aware AI Analyst",
    description:
      "Ask natural questions like 'Identify our top 5 revenue anomalies'. The AI reads your actual dataset schema and returns actionable insights.",
    gradient: "from-accent-foreground/8 via-accent-foreground/4 to-transparent",
    iconBg: "badge-ai",
  },
  {
    icon: BarChart3,
    badge: "11+ Visualizers",
    title: "Interactive Charts & Heatmaps",
    description:
      "Render bar charts, area trends, scatter matrices, treemaps, and radar graphs in real time. Export crisp vector SVG or high-res PNGs.",
    gradient: "from-success/8 via-success/4 to-transparent",
    iconBg: "bg-success/10 text-success-on-surface",
  },
  {
    icon: FileText,
    badge: "Automated Reports",
    title: "Executive PDF & Doc Generation",
    description:
      "Turn multi-page data metrics into executive summaries, key trends, and board-ready recommendations in PDF, Markdown, or DOCX formats.",
    gradient: "from-warning/8 via-warning/4 to-transparent",
    iconBg: "bg-warning/12 text-warning-on-surface",
  },
  {
    icon: TrendingUp,
    badge: "Predictive Analytics",
    title: "AI Trend Forecasting",
    description:
      "Project sales, user acquisition, and financial metrics into future periods with mathematically backed confidence intervals.",
    gradient: "from-info/8 via-info/4 to-transparent",
    iconBg: "bg-info/10 text-info-on-surface",
  },
  {
    icon: Table2,
    badge: "SQL Workspace",
    title: "High-Performance Query Engine",
    description:
      "Direct SQL sandbox for developers. Write custom aggregations, save reusable views, and let AI explain complex query plans.",
    gradient: "from-muted-foreground/8 via-muted-foreground/4 to-transparent",
    iconBg: "bg-muted text-foreground",
  },
];

const STEPS = [
  { step: "01", title: "Drop Your Dataset", desc: "Upload raw CSV, XLSX, or JSON files. Automatic schema validation in under 500ms." },
  { step: "02", title: "AI Analyzes & Synthesizes", desc: "Gemini AI detects anomalies, correlation matrices, and distribution metrics automatically." },
  { step: "03", title: "Export Board-Ready Insights", desc: "Download executive PDFs, share interactive dashboards, or export vector charts." },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">
      {/* ── Ambient Background Glows ────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[45rem] w-[90rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/12 via-info/8 to-transparent blur-[130px] opacity-70" />
        <div className="absolute top-[40rem] -left-40 h-[35rem] w-[50rem] rounded-full bg-gradient-to-r from-primary/8 to-info/6 blur-[140px]" />
        <div className="absolute top-[80rem] -right-40 h-[35rem] w-[50rem] rounded-full bg-gradient-to-l from-info/8 to-primary/6 blur-[140px]" />
      </div>

      {/* ── Header Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl gradient-brand shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="InsightHub AI logo"
                width={32}
                height={32}
                className="size-7 object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                InsightHub AI
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                Enterprise Intelligence
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Show
              when="signed-out"
              fallback={
                <Button asChild variant="gradient" size="sm" className="shadow-md shadow-primary/20">
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            >
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="gradient" size="sm" className="shadow-md shadow-primary/20">
                <Link href="/sign-up">
                  Get Started Free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </Show>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        {/* ── Hero Section ──────────────────────────────────────────── */}
        <section className="relative px-6 pt-20 pb-16 text-center lg:pt-28 lg:pb-24">
          <div className="mx-auto max-w-4xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-inner backdrop-blur-md mb-8">
              <Zap className="size-3.5 fill-primary text-primary animate-pulse" />
              <span>Engineered for High-Scale Analytics & AI Forecasting</span>
              <span className="h-3 w-px bg-primary/30" />
              <span className="text-foreground/80 font-normal">Next.js 16 + Gemini</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
              Turn Raw Data Into{" "}
              <span className="text-gradient-brand">
                Decision-Ready
              </span>{" "}
              Intelligence
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Upload CSVs, Excel spreadsheets, or JSON feeds. InsightHub AI automatically generates key performance indicators, 11+ dynamic charts, anomaly alerts, and executive board reports in seconds.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Show
                when="signed-out"
                fallback={
                  <Button asChild size="lg" variant="gradient" className="h-13 px-8 text-base shadow-xl shadow-primary/25 rounded-xl">
                    <Link href="/dashboard">
                      Launch Workspace
                      <ArrowRight className="size-5 ml-1" />
                    </Link>
                  </Button>
                }
              >
                <Button asChild size="lg" variant="gradient" className="h-13 px-8 text-base shadow-xl shadow-primary/25 rounded-xl">
                  <Link href="/sign-up">
                    Start Free Workspace
                    <ArrowRight className="size-5 ml-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-13 px-8 text-base rounded-xl border-border/80 glass hover:bg-muted/50">
                  <Link href="/sign-in">
                    <Play className="size-4 mr-2 text-primary fill-primary/20" />
                    Sign In to Demo
                  </Link>
                </Button>
              </Show>
            </div>

            {/* Micro Trust Indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success-on-surface" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success-on-surface" /> Enterprise AES-256 Security
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-success-on-surface" /> 20,000+ Scalable Concurrency
              </span>
            </div>
          </div>

          {/* ── Interactive Live UI Mockup Preview ───────────────────────── */}
          <div className="mx-auto mt-16 max-w-5xl px-2 sm:px-4">
            <div className="relative rounded-2xl border border-border/60 bg-card/60 p-3 shadow-2xl shadow-primary/10 glass backdrop-blur-xl">
              {/* Window Controls */}
              <div className="flex items-center justify-between border-b border-border/40 pb-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-destructive/80" />
                  <div className="size-3 rounded-full bg-warning/80" />
                  <div className="size-3 rounded-full bg-success/80" />
                  <span className="ml-2 text-xs font-mono text-muted-foreground">insighthub-ai / dashboard / analytics</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-primary/10 text-primary border-primary/20">
                  Live System Status: Optimal
                </Badge>
              </div>

              {/* Mockup Dashboard Content */}
              <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-3 text-left">
                {/* Metric Card 1 */}
                <div className="rounded-xl border border-border/40 bg-background/50 p-4 shadow-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total Revenue</span>
                    <TrendingUp className="size-4 text-success-on-surface" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">$1,482,900</p>
                  <p className="mt-1 text-xs text-success-on-surface font-medium">↑ +24.8% vs last quarter</p>
                </div>

                {/* Metric Card 2 */}
                <div className="rounded-xl border border-border/40 bg-background/50 p-4 shadow-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rows Analyzed</span>
                    <Layers className="size-4 text-primary" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">542,100</p>
                  <p className="mt-1 text-xs text-primary font-medium">Auto-indexed & schema-parsed</p>
                </div>

                {/* Metric Card 3 */}
                <div className="rounded-xl border border-border/40 bg-background/50 p-4 shadow-sm">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Forecast Confidence</span>
                    <ShieldCheck className="size-4 text-accent-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">99.4%</p>
                  <p className="mt-1 text-xs text-accent-foreground font-medium">AI Regression Model</p>
                </div>

                {/* Chart Mockup Banner */}
                <div className="sm:col-span-3 rounded-xl border border-border/40 bg-background/40 p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold">Q3 Sales Forecast & Trend Analysis</p>
                      <p className="text-xs text-muted-foreground">Generated by Gemini 2.5 Flash from raw dataset</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      11 Chart Types Available
                    </Badge>
                  </div>
                  {/* Decorative Simulated Wave Line */}
                  <div className="h-32 w-full flex items-end justify-between gap-1.5 pt-4">
                    {[40, 55, 35, 70, 65, 85, 90, 110, 95, 130, 145, 160].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          style={{ height: `${h}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                            i >= 8
                              ? "bg-gradient-to-t from-accent-foreground/70 to-accent-foreground"
                              : "bg-gradient-to-t from-primary/70 to-info"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Metrics Bar ──────────────────────────────────────── */}
        <section className="border-y border-border/60 bg-card/30 glass py-12">
          <div className="mx-auto max-w-7xl px-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.change}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bento Grid Features ────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              Full-Stack Capabilities
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Everything Between Raw Data & Board Decisions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Replace multiple disconnected spreadsheets, BI tools, and report builders with one integrated, AI-native platform.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENTO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.title}
                  className={`relative overflow-hidden p-6 border-border/60 bg-gradient-to-b ${f.gradient} glass transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex size-11 items-center justify-center rounded-xl ${f.iconBg} shadow-inner`}>
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      {f.badge}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Workflow Steps ────────────────────────────────────────── */}
        <section className="border-t border-border/60 bg-card/20 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Three Steps to Executive Insights
              </h2>
              <p className="mt-3 text-muted-foreground">
                From raw CSV/Excel upload to a fully formatted presentation deck in under 60 seconds.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {STEPS.map((st) => (
                <div key={st.step} className="relative rounded-2xl border border-border/60 bg-background/50 p-6 shadow-sm glass">
                  <span className="text-4xl font-black text-primary/30 font-mono">{st.step}</span>
                  <h3 className="mt-3 text-lg font-bold">{st.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Scalability & Architecture Section ──────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/8 via-info/6 to-transparent p-8 sm:p-12 glass relative overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <Badge variant="outline" className="mb-4 border-primary/40 bg-primary/10 text-primary">
                  Built For Enterprise Scale
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Can InsightHub AI handle 20,000+ Concurrent Users?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Yes! Powered by Next.js 16 Edge deployment on Vercel and Supabase Transaction Pooler, the platform automatically scales across hundreds of edge locations globally with zero cold-starts and connection safety.
                </p>
                <div className="mt-6 space-y-2 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success-on-surface" /> Automatic Edge CDN Distribution (Vercel)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success-on-surface" /> Transaction-level Connection Pooling (Supabase)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success-on-surface" /> Parallel Worker Threads for CSV Parsing
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-2xl border border-border/40 bg-background/60 p-5 glass">
                  <p className="text-3xl font-black text-primary">20,000+</p>
                  <p className="text-xs text-muted-foreground mt-1">Concurreny Capacity</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/60 p-5 glass">
                  <p className="text-3xl font-black text-success-on-surface">99.99%</p>
                  <p className="text-xs text-muted-foreground mt-1">System Uptime</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/60 p-5 glass">
                  <p className="text-3xl font-black text-info-on-surface">&lt; 100ms</p>
                  <p className="text-xs text-muted-foreground mt-1">Edge Response</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/60 p-5 glass">
                  <p className="text-3xl font-black text-accent-foreground">256-bit</p>
                  <p className="text-xs text-muted-foreground mt-1">SSL/TLS Security</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ───────────────────────────────────── */}
        <section className="border-t border-border/60 bg-gradient-to-b from-card/30 to-background py-24 text-center">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner mb-6">
              <Sparkles className="size-7" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Ready to Accelerate Your Data Workflow?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Join thousands of data professionals, analysts, and decision-makers leveraging AI-powered insights today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="gradient" className="h-13 px-8 text-base shadow-xl shadow-primary/25 rounded-xl">
                <Link href="/sign-up">
                  Create Free Account
                  <ArrowRight className="size-5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Portfolio Footer ───────────────────────────────── */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-white">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-semibold text-foreground">InsightHub AI</span>
            <span>© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Badge variant="outline" className="border-border/60 text-muted-foreground">
              Designed & Engineered for High Performance
            </Badge>
          </div>
        </div>
      </footer>
    </div>
  );
}

