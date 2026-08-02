# InsightHub AI — Build Progress

**Last updated:** 2026-08-02
**Verification state:** `npm run verify` green — typecheck clean, ESLint clean repo-wide, 134/134 assertions passing, production build succeeds with all 22 routes registered. Dev server runs and the initial migration is applied.

This document tracks what is built, what is verified, what is deliberately deferred, and what comes next. It is a working log, not a spec — the spec is the original brief.

---

## 1. Status at a glance

| Module | State | Notes |
| --- | --- | --- |
| Foundation (schema, auth, RBAC, design system) | **Done** | 12 Prisma models, 21 UI primitives |
| Authentication | **Done** | Clerk + webhook user mirroring |
| Dashboard | **Done** | Stat cards, activity feed, panels |
| Projects | **Done** | Full CRUD, team management, RBAC, tests |
| Datasets | **Done** | Data layer, upload route, list, preview, schema, versions |
| Data Cleaning | **Done** | Six operations + AI suggestions, surfaced as a dataset tab |
| Analytics + Charts | **Done** | KPI grid, Recharts distributions, correlations, outliers |
| AI Assistant | **Done** | Streaming chat over dataset schema and preview |
| SQL Workspace | **Done** | Save, organize, and AI-explain queries. Execution deferred — see §3 |
| AI Report Generator | **Done** | Generate, view, share by slug |
| Forecasting | **Done** | Trend projection with AI narrative |
| Notifications | **Done** | Read/mark-all/delete |
| Audit Logs | **Done** | Read-only trail over `ActivityLog` |
| Settings | **Done** | Profile, API keys, appearance |
| Global Search | Partial | Command palette navigates; does not search records |

Roughly **11,500 lines** of TypeScript across `app/`, `features/`, `lib/`, and `scripts/`.

---

## 2. Architecture

Code is grouped by feature, not by file type. See `README.md` for the directory map and the read/write conventions (`queries.ts` access-scoped at the source, `actions.ts` following the same five steps, shared Zod schemas, authorization next to the data rather than in path matching).

Two structural notes worth keeping in mind:

**`lib/roles.ts` is separate from `lib/authorization.ts` on purpose.** `authorization.ts` carries `import "server-only"`, which makes it unreachable from a test runner. The pure predicates live outside that boundary so both the DB-backed checks and the query layer can consume them, and `scripts/verify-rbac.ts` can assert them directly.

**`lib/navigation.ts` is the single source for the sidebar, command palette, and `g`-prefixed shortcuts.** A page that is not registered there is built but unreachable — which is exactly how the Audit Log and Forecasting pages sat orphaned until they were wired in.

### Local conventions that have each caused a bug

- `DropdownMenuItem` takes a boolean `destructive` prop, **not** `variant="destructive"`.
- `components/ui/input.tsx` exports both `Input` **and** `Textarea`. Do not hand-roll a `<textarea>`.
- `EmptyState` takes `action` as an **object** (`{ label, href?, onClick?, icon? }`), not a rendered node. Passing a `<Button>` typechecks as `ReactElement` against nothing and fails at the prop boundary.

---

## 3. Security posture

| Requirement | Where it is enforced |
| --- | --- |
| Role-based access | `lib/roles.ts` defines ADMIN > EDITOR > VIEWER; `requireProjectRole()` enforces |
| Protected routes | Dashboard layout + every Server Action, not path matching |
| Row-level access | `visibleProjectsWhere()` composed into every project and dataset query |
| Server-side validation | Every Server Action re-parses with Zod, ignoring client results |
| Upload validation | Extension allowlist, declared MIME allowlist, and a magic-byte sniff of actual content |
| Rate limiting | Fixed-window per user per action |
| Input sanitization | Control chars stripped, whitespace collapsed, lengths capped |
| XSS prevention | React escapes all interpolation; zero `dangerouslySetInnerHTML` in app code |
| CSRF protection | Server Actions are POST-only with origin check and non-guessable action ids |
| Audit trail | `logActivity()` on every mutation |

### Decisions that are easy to get wrong

**1. Deletion is owner-only, not ADMIN.** An ADMIN collaborator can invite, re-role, and archive, but must not be able to destroy data belonging to someone else. `canDeleteProject()` is an ownership check, not a role check.

**2. Member mutations are scoped by `{ id, projectId }` together.** Looking a member up by id alone would let a caller who administers project A pass a member id from project B and mutate it.

**3. Missing and forbidden are indistinguishable.** Both raise `NotFoundError`, rendering a 404. A 403 would confirm the id exists, making it enumerable.

**4. Grid and detail share one permission derivation.** This was a real bug, self-caught: the grid gated editing on ownership while the detail page used real roles, so an EDITOR collaborator saw no edit controls in the list but did on the detail page. `listProjects` now resolves `role` / `isOwner` / `canEdit` server-side.

**5. Malformed URLs degrade, they do not 500.** Query strings are user-editable input, so every filter schema `safeParse()`s and falls back to defaults. This includes the dataset detail page's `?tab=` value, which is checked against the known tab list rather than passed through.

**6. Extension and MIME type are both client-controlled.** Only the magic-byte sniff in `lib/file-validation.ts` reads what the file actually is. A `.csv` beginning with `PK\x03\x04` is a renamed zip and is rejected — asserted directly in `scripts/verify-upload-guards.ts`.

### Known gaps, deliberately deferred

- **SQL execution is not implemented.** The workspace saves, organizes, and AI-explains queries; it does not run them against uploaded datasets. Executing user-authored SQL needs a sandboxed, read-only, parameterized path with its own resource limits — shipping a half-guarded version would be worse than shipping none. The UI states this plainly rather than implying otherwise.
- **Rate limiter is in-process.** On multi-instance deployments it degrades to per-instance limits. Needs Redis before it is a hard ceiling.
- **No Content-Security-Policy.** Clerk and Supabase inject scripts and frames whose hosts vary by deployment. Belongs in `next.config.ts` where the allowlist can be reviewed as a whole.
- **Global search does not search records.** The command palette navigates between sections only.

---

## 4. Verification

```bash
npm run verify     # typecheck + lint + tests
```

| Suite | Assertions | Covers |
| --- | --- | --- |
| `scripts/verify-rbac.ts` | 34 | Role hierarchy, owner-overrides-membership, per-role edit/manage rights, owner-only delete |
| `scripts/verify-project-schemas.ts` | 33 | Sanitization, length/format rejection, defaults, tag normalization, injected URL filter values |
| `scripts/verify-dataset-schemas.ts` | 41 | Upload/rename/restore contracts, dataset URL filters, extension and MIME allowlists |
| `scripts/verify-upload-guards.ts` | 26 | Magic-byte sniffing, binary and empty rejection, filename path-traversal stripping, bounded limits |

All four import the real modules rather than restating the rules, so changing a rule surfaces here instead of passing against a stale copy. No database dependency, so they run in about a second.

### Also verified

- `npx tsc --noEmit` — clean
- `npx eslint .` — clean repo-wide except one unavoidable warning: `useReactTable()` returns unmemoizable functions, so React Compiler skips `dataset-table.tsx`. That is a TanStack API constraint, not a fixable defect.
- `npm run build` — succeeds; all 22 routes register
- `npm run dev` — serves; the dashboard renders for a signed-in user with no errors
- `npx prisma migrate dev` — initial migration applied; all 12 models exist in the database

### Not verified

**Everything past an empty dashboard.** No project, dataset, or upload exists yet,
so no RBAC path, no chart, and no AI feature has run against real rows. See §5.

---

## 5. Database state

The credential problem that blocked earlier sessions is **resolved**. The initial
migration (`prisma/migrations/20260802022600_init/`) has been generated and
applied, so all 12 models plus the `_Favorites` join table exist in `insighthub`.

**The dashboard renders for a signed-in user** — `GET /dashboard 200`, no errors.
`lib/auth.ts`'s fallback sync created the `User` row on first request, so the
Clerk webhook is not required for local development. It is still needed in
deployment, where `user.updated` and `user.deleted` have no fallback path.

One gotcha worth knowing: `lib/prisma.ts` caches the `pg` Pool on `globalThis` to
survive hot reloads, so it is built once per process from `process.env` at
startup. **Changing `DATABASE_URL` requires a full dev-server restart** — hot
reload will not pick it up, and the symptom is a credentials error from a server
that was working before the edit.

Still unexercised: everything past an empty dashboard. Projects, datasets,
uploads, and every RBAC path have no rows behind them yet. The manual checklist
in `README.md` is the next step.

---

## 6. What comes next

In rough priority order:

1. **Create a project and upload a dataset**, then walk the checklist in `README.md`. The schema is live and the dashboard renders, but every screen past it is still empty — no RBAC path, chart, or AI feature has run against real rows. The dataset upload path in particular has never run against real Supabase storage.
2. **SQL execution**, if it is wanted — sandboxed, read-only, parameterized, with statement timeouts and row caps.
3. **Global search over records**, extending the command palette past navigation.
4. **Redis-backed rate limiting** and a **Content-Security-Policy**, both of which only matter once this is deployed behind more than one instance.
