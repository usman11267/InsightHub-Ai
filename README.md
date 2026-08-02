# InsightHub AI

An AI-powered data analytics platform. Upload datasets, clean them, explore them
with SQL and natural language, and generate charts and reports — organized into
projects your team can collaborate on.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide, Framer Motion |
| Data | Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`) |
| Auth | Clerk |
| Storage | Supabase Storage |
| AI | Google Gemini |
| Forms & validation | React Hook Form + Zod |
| Tables & charts | TanStack Table, Recharts |

## Getting started

### 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 14+ (local or hosted)
- A Clerk application
- A Supabase project, for dataset file storage
- A Google Gemini API key

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in every key:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Your Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → signing secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server-only) |
| `GEMINI_API_KEY` | Google AI Studio |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |

`CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` bypass all access control.
Keep them server-side and never prefix them with `NEXT_PUBLIC_`.

### 4. Set up the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

To inspect data during development:

```bash
npx prisma studio
```

### 5. Point Clerk at the webhook

User records are mirrored into the local `User` table by
`app/api/webhooks/clerk/route.ts`. In the Clerk dashboard, add a webhook endpoint
at `<APP_URL>/api/webhooks/clerk` subscribed to `user.created`, `user.updated`,
and `user.deleted`.

For local development, expose it with a tunnel:

```bash
ngrok http 3000
```

Without this, sign-in succeeds but there is no local user row to attach projects
to, so the dashboard bounces back to sign-in.

### 6. Run

```bash
npm run dev
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Authorization and validation suites |
| `npm run verify` | Typecheck, lint, and tests together |

Run `npm run verify` before every commit and in CI.

## Architecture

Code is grouped by feature, not by file type.

```
app/
  (auth)/                 Sign-in and sign-up routes
  (dashboard)/            Authenticated shell and pages
  api/webhooks/clerk/     Clerk → local User sync
features/
  <feature>/
    schemas.ts            Zod contracts, shared client and server
    queries.ts            Read paths (server-only, access-scoped)
    actions.ts            Server Actions (write paths)
    components/           Feature UI
components/
  ui/                     Design-system primitives
  shared/                 Cross-feature composites
lib/
  auth.ts                 Session and current-user helpers
  roles.ts                Pure role-hierarchy rules
  authorization.ts        Database-backed permission checks
  rate-limit.ts           ActionResult type and rate limiting
  activity.ts             Audit logging and notifications
prisma/schema.prisma
proxy.ts                  Session context and security headers
scripts/                  Verification suites
```

### Conventions

**Reads live in `queries.ts` and are access-scoped at the source.** Every project
query composes `visibleProjectsWhere(userId)`, so a page physically cannot forget
to scope its results. A record that does not exist and a record the user may not
see both raise `NotFoundError`, which renders a 404 — the two cases are
deliberately indistinguishable so IDs cannot be probed for existence.

**Writes live in `actions.ts` and follow the same five steps:**

1. `requireUser()` first — never trust a client-supplied user id.
2. Validate the payload with Zod before touching the database.
3. `requireProjectRole()` for anything scoped to an existing project.
4. Rate-limit the mutation per user.
5. Return an `ActionResult`, never a thrown error.

`ActionResult<T>` is a discriminated union — `{ success: true, data: T }` or
`{ success: false, error: string }` — so callers must handle the failure case to
reach the data, and internal errors never surface to the client as stack traces.

**Validation schemas are shared.** The same Zod schema backs the React Hook Form
resolver and the Server Action's re-parse, so client and server cannot drift.
Client-side validation is a convenience; the server-side parse is the trust
boundary.

**Authorization sits next to the data, not in path matching.** `proxy.ts`
attaches session context and security headers but deliberately does not gate by
route pattern — Clerk 7 deprecated `createRouteMatcher` because a matcher can
diverge from how Next actually resolves routes, leaving protected resources
reachable. Instead `app/(dashboard)/layout.tsx` redirects when there is no
database user, Server Actions call `requireUser()` and `requireProjectRole()`,
and route handlers verify their own credentials.

## Security

| Requirement | Implementation |
| --- | --- |
| Role-based access | `lib/roles.ts` defines ADMIN > EDITOR > VIEWER; `requireProjectRole()` enforces it |
| Protected routes | Enforced in the dashboard layout and in each Server Action, not by path matching |
| Row-level access | `visibleProjectsWhere()` composed into every project query |
| Server-side validation | Every Server Action re-parses input with Zod, ignoring client-side results |
| Rate limiting | Fixed-window, per user per action, in `lib/rate-limit.ts` |
| Input sanitization | Control characters stripped, whitespace collapsed, lengths capped |
| XSS prevention | React escapes all interpolated content; no `dangerouslySetInnerHTML` anywhere in app code |
| CSRF protection | Server Actions are POST-only with an origin check and non-guessable action ids |
| Security headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` set in `proxy.ts` |
| Audit trail | `logActivity()` records every mutation; it swallows its own errors so audit can never break a write |

Three rules that are easy to get wrong and are enforced deliberately:

- **Deletion is owner-only, not ADMIN.** An ADMIN collaborator can invite,
  re-role, and archive, but must not be able to destroy data belonging to
  someone else. See `canDeleteProject()`.
- **Member mutations are scoped by `{ id, projectId }` together.** Looking a
  member up by id alone would let a caller who administers project A pass a
  member id from project B and mutate it.
- **The grid and the detail page share one permission derivation.** `listProjects`
  resolves `role`, `isOwner`, and `canEdit` server-side, so a list view cannot
  drift from the detail view's rules.

Known limits: the rate limiter is in-process, so on multi-instance deployments it
degrades to per-instance limits — back it with Redis before relying on it as a
hard ceiling. Content-Security-Policy is not yet set, because Clerk and Supabase
inject scripts and frames whose hosts vary by deployment; it belongs in
`next.config.ts` where the allowlist can be reviewed as a whole.

## Testing

`npm test` runs four suites — 134 pure assertions with no database dependency, so
they are fast enough to run on every save:

- `scripts/verify-rbac.ts` — the role hierarchy, owner-overrides-membership, each
  role's edit and manage rights, and the owner-only delete rule.
- `scripts/verify-project-schemas.ts` — sanitization, length and format
  rejection, defaults, tag normalization, and rejection of injected filter values
  arriving from the URL.
- `scripts/verify-dataset-schemas.ts` — upload, rename, and restore contracts,
  dataset filter parsing from the URL, and the extension and MIME allowlists.
- `scripts/verify-upload-guards.ts` — magic-byte sniffing (a zip renamed to
  `.csv` is rejected), empty and binary content, and filename path-traversal
  stripping.

Each suite has its own script (`test:rbac`, `test:schemas`, `test:datasets`,
`test:upload`) if you want to run one in isolation. All four import the real
modules rather than restating the rules, so changing a rule surfaces here instead
of silently passing against a stale copy.

### Manual checks worth running against a seeded database

1. Sign in as a project owner; create, edit, favorite, archive, and delete a project.
2. Invite a second account as VIEWER. Confirm it can open the project but sees no
   edit controls, and that invoking the update action directly is still refused.
3. Re-role that account to EDITOR. Confirm edit controls appear in both the grid
   and the detail page — they share one derivation, so they must agree.
4. Re-role to ADMIN. Confirm it can manage members but that delete stays hidden
   and is refused server-side.
5. Request a project id belonging to an unrelated account. Confirm a 404, not a 403.
6. Hand-edit the query string to `?status=SECRET&page=-1`. Confirm the page falls
   back to defaults rather than erroring.
7. Upload a CSV, then rename a `.zip` to `.csv` and upload it. Confirm the first
   parses and the second is rejected on content, not extension.
8. Open a dataset's Clean tab as a VIEWER and as an EDITOR. Confirm the VIEWER
   sees the no-access message and the EDITOR can run an operation that produces a
   new version.

## Deployment

### Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Add every variable from `.env.example` under Settings → Environment Variables,
   for both Production and Preview.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed origin.
4. Set the build command to `prisma generate && next build`, so the Prisma client
   is generated against the deployment's schema.
5. Deploy.

### Database migrations

Vercel builds do not run migrations. Apply them from a trusted environment before
or during release:

```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

Use a pooled connection string for the application (Supabase's pooler, PgBouncer,
or Neon's pooled endpoint) and a direct connection for migrations.

### Post-deploy checklist

- [ ] Clerk webhook endpoint updated to the production URL and returning 2xx.
- [ ] Clerk allowed origins include the production domain.
- [ ] Supabase storage bucket created, with the service role key server-side only.
- [ ] `prisma migrate deploy` applied against production.
- [ ] Sign up with a fresh account and confirm a `User` row appears.
- [ ] `npm run verify` green on the release commit.

## Troubleshooting

**`password authentication failed for user "postgres"`** — the `DATABASE_URL`
credentials do not match the running Postgres instance. Verify with
`psql "$DATABASE_URL" -c "select 1"`.

**Signed in, but the dashboard redirects back to sign-in** — the Clerk webhook is
not reaching the app, so no local `User` row exists. Check the webhook's delivery
log in the Clerk dashboard.

**`PrismaClientInitializationError` during build** — run `npx prisma generate`,
and confirm the build command includes it.
