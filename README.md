<div align="center">

# ⚡ InsightHub AI
### Enterprise AI Data Analytics & Executive Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Groq](https://img.shields.io/badge/Groq_AI-GPT--OSS_120B-f55036?style=for-the-badge)](https://groq.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

[**Live Demo**](https://insighthub1.vercel.app/) · [**Explore Docs**](#architecture) · [**Setup Guide**](#getting-started)

</div>

---

## 🌟 Overview

**InsightHub AI** is a next-generation data analytics platform engineered for modern teams, data analysts, and decision-makers. Upload raw datasets (`CSV`, `XLSX`, `JSON`) and get instant KPIs, 11+ dynamic interactive chart visualizers, statistical anomaly detection, AI predictive trend forecasting, and executive board-ready PDF reports in seconds.

Designed with high-concurrency serverless architecture, edge CDN distribution, and strict role-based authorization (RBAC), InsightHub AI easily scales to **20,000+ concurrent active sessions**.

---

## 🎨 Key Features & Screenshots

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                            INSIGHTHUB AI PLATFORM                        │
 ├───────────────────┬──────────────────────┬───────────────────────────────┤
 │  📊 Universal Data│  🤖 AI Analyst       │  📈 AI Trend Forecasting      │
 │  Upload CSV/XLSX  │  Ask natural questions│  Predict future trends with   │
 │  with auto schema │  & get instant stats │  confidence intervals         │
 ├───────────────────┼──────────────────────┼───────────────────────────────┤
 │  📊 11+ Visualizers│  📄 Auto Reports     │  ⚡ High-Performance SQL      │
 │  Render charts &  │  Export PDF, Markdown│  Direct Postgres query        │
 │  export SVG/PNG   │  & executive summaries│  sandbox with AI explainer    │
 └───────────────────┴──────────────────────┴───────────────────────────────┘
```

### ✨ Core Capabilities

1. **Universal Data Ingestion & Schema Profiling**:
   - Automated type detection, null-value percentage calculation, and unique distribution profiling.
   - SHA-256 file checksum deduplication to prevent redundant uploads.

2. **Context-Aware AI Assistant (Groq / GPT-OSS 120B / Mixtral)**:
   - Chat directly with datasets using natural language.
   - Instant query answers backed by actual schema and sample rows.

3. **11+ Dynamic Chart Visualizers**:
   - Area, Bar, Line, Scatter, Treemap, Radar, Heatmap, and Pie charts powered by Recharts.
   - High-res PNG & vector SVG export support.

4. **Automated Executive Report Generator**:
   - Executive summaries, key insights, anomaly alerts, and strategic recommendations exported to PDF, DOCX, or Markdown.

5. **AI Trend Forecasting**:
   - Multi-period linear and exponential trend forecasting with confidence intervals.

6. **Interactive SQL Sandbox**:
   - Write raw PostgreSQL queries, save reusable snippets, and let AI explain complex query execution plans.

7. **Enterprise Multi-Role Collaboration & Audit Trail**:
   - ADMIN, EDITOR, and VIEWER roles per project.
   - Complete audit logging (`logActivity()`) for compliance.

---

## 🚀 Tech Stack

| Component | Technology / Library |
| :--- | :--- |
| **Framework** | Next.js 16.2 (App Router, Turbopack, React 19) |
| **Language** | TypeScript (Strict Mode) |
| **Styling** | Tailwind CSS v4, Glassmorphism UI, Lucide Icons |
| **Database** | Supabase PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| **Authentication** | Clerk (Serverless Session Management & Webhooks) |
| **Storage** | Supabase S3 File Storage |
| **AI Inference** | Groq SDK (GPT-OSS 120B / Mixtral-8x7B MoE / Gemini) |
| **Visualizations** | Recharts, TanStack Table v8 |
| **Validation** | Zod (Shared Client/Server Trust Boundary) |

---

## 🛠 Architecture & Directory Structure

```
myfirstnextapp/
├── app/
│   ├── (auth)/                 # Clerk Sign-in & Sign-up pages
│   ├── (dashboard)/            # Authenticated layout & sub-pages
│   │   ├── dashboard/analytics # Live analytics dashboard
│   │   ├── dashboard/assistant # AI Chat assistant
│   │   ├── dashboard/forecasting # AI Trend forecasting
│   │   ├── dashboard/sql       # Interactive SQL sandbox
│   │   └── dashboard/reports   # Executive report builder
│   ├── api/                    # API Route Handlers (AI, Upload, Webhooks)
│   ├── layout.tsx              # Root layout & OpenGraph metadata
│   └── page.tsx                # High-conversion aesthetic landing page
├── features/                   # Domain-driven feature modules
│   ├── analytics/              # Compute algorithms & stat helpers
│   ├── datasets/               # Upload dropzones & table grids
│   ├── forecasting/            # Forecast panel & regression logic
│   ├── reports/                # PDF/Markdown report builders
│   └── sql/                    # SQL execution sandbox
├── lib/
│   ├── auth.ts                 # Resilient user sync & auth helpers
│   ├── gemini.ts               # Groq AI client & prompt templates
│   ├── prisma.ts               # Global connection pool singleton (pg.Pool)
│   └── rate-limit.ts           # Sliding window rate limiter
└── prisma/
    └── schema.prisma           # Relational Postgres schema & enums
```

---

## ⚙️ Getting Started

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **PostgreSQL**: Hosted (Supabase Transaction Pooler recommended) or local
- **Clerk**: API Keys & Webhook secret
- **Groq API**: Free key from [console.groq.com](https://console.groq.com)

### 2. Installation & Setup

```bash
# 1. Clone repository
git clone https://github.com/usman11267/InsightHub-Ai.git
cd InsightHub-Ai

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env
```

### 3. Environment Variables (`.env`)

```env
DATABASE_URL="postgresql://postgres.xxx:xxx@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

GROQ_API_KEY="gsk_..."
GROQ_MODEL="gpt-oss-120b"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup & Dev Server

```bash
# Generate Prisma Client & apply migrations
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🔒 Security & Performance Features

- **Connection Pool Safety**: `lib/prisma.ts` uses global singleton pooling with `max: 1` per serverless container to prevent connection leaks.
- **Resilient Fallbacks**: Auth & queries gracefully handle cold database states and transient network delays without rendering crash screens.
- **RBAC Authorization**: Explicit server-side permission verification on all Server Actions.
- **Input Sanitization**: Re-parsing of all client inputs via Zod schemas to ensure type-safe boundaries.

---

<div align="center">

**Built with ❤️ by Usman — Senior Full Stack AI Engineer**

[![GitHub](https://img.shields.io/badge/GitHub-usman11267-181717?style=flat&logo=github)](https://github.com/usman11267)

</div>

