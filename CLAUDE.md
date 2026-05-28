# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A school umbrella-rental web app deployed on **Vercel** with **Vercel Postgres** as the database. Frontend is a single static HTML/CSS/JS page in `public/`; backend is a set of Vercel serverless functions in `api/`. The UI is in Korean.

Push to GitHub `main` → Vercel auto-deploys. There is no separate build step.

## Project layout

```
api/                        Vercel serverless functions (ESM, Node 20+)
├── status.js               GET /api/status?umbrella=N   (public)
├── rent.js                 POST /api/rent                (public)
├── return.js               POST /api/return              (public)
└── admin/                  all require x-admin-password header
    ├── login.js            POST   - verify password
    ├── stats.js            GET    - counts (total/avail/rented/overdue)
    ├── active.js           GET    - currently-rented umbrellas
    ├── register.js         POST   - register new umbrella
    ├── force-return.js     POST   - admin override return
    ├── delete.js           POST   - delete umbrella
    ├── list.js             GET    - all umbrellas + QR URLs
    └── history.js          GET    - rental log

lib/
├── db.js                   re-exports `sql` from @vercel/postgres
├── auth.js                 checkAdmin(req) / requireAdmin(req, res)
└── utils.js                formatDate, maskName, isOverdue, hoursSince,
                            deriveStatus, getBaseUrl, OVERDUE_HOURS, TIMEZONE

db/
└── schema.sql              tables + partial-unique indexes; run once

public/
└── index.html              the entire frontend (HTML + CSS + JS in one file)
```

## Local dev & verification

- `node --check api/foo.js` parses but doesn't execute (no DB context).
- For real runtime: `vercel dev` (after `vercel link` + `vercel env pull .env`). Hits real Vercel Postgres.
- No test suite. Verify by running `vercel dev` and exercising the flow in the browser.
- See `README.md` for the full deployment / local setup walkthrough.

## Architecture (the non-obvious parts)

**Static frontend.** `public/index.html` is the single page. No framework, no bundler. Vanilla JS. The `api(path, opts)` helper wraps `fetch()`; admin calls set `opts.admin = true` which adds the `x-admin-password` header. There is no router — Vercel serves `public/index.html` at `/`, and SPA-style navigation is done by toggling `.view` sections via `switchTab` / `showOnlyView`.

**Stateless admin auth.** No sessions. `POST /api/admin/login` only verifies the password from `x-admin-password` header against `process.env.ADMIN_PASSWORD`. On success, the client keeps the password in a `var adminPassword` and passes it as that header on every subsequent admin call. Every admin endpoint re-checks via `requireAdmin(req, res)`; on failure it 401s with `{ok:false, message}`, and the client treats that as auth loss (`handleAuthFail` → back to scan tab).

**Status is derived.** An umbrella's current state (`available`/`rented`/`overdue`) is computed from the `rentals` table — there is no status column on `umbrellas`. "Overdue" means a `status='rented'` row older than `OVERDUE_HOURS` (24h).

**Concurrency via partial unique indexes, not locks.** GAS used `LockService`. Postgres handles this declaratively:
- `idx_one_active_per_umbrella` — `UNIQUE (umbrella_number) WHERE status = 'rented'`
- `idx_one_active_per_student` — `UNIQUE (student_id) WHERE status = 'rented'`

INSERT into `rentals` is the rent operation. If two students try to rent the same umbrella concurrently, exactly one INSERT succeeds; the loser gets a `23505` unique violation. `api/rent.js` catches that and reports "이미 대여 중인 우산" or the student-side equivalent. **Do not add explicit locks** — let the indexes do the work.

**Returns are conditional UPDATEs.** `api/return.js` does a single `UPDATE ... WHERE umbrella_number = $1 AND student_name = $2 AND student_id = $3 AND status = 'rented' RETURNING id`. Zero rows → either no active rental or info mismatch; the route then runs one diagnostic SELECT to pick the right message. This avoids a SELECT-then-UPDATE race.

**Privacy split.** `api/status.js` returns `maskName(student_name)` and **omits** `student_id` / `phone` entirely. Admin endpoints return the full record. Preserve this split when adding student-facing data.

**Client/server contract.** API routes return plain JSON, shape `{ ok: boolean, message?: string, ...data }`. HTTP status is mostly 200 even for `ok:false` (validation/business errors); 401 is reserved for auth failure, 405 for wrong method, 500 for unexpected errors. Keep this shape when adding endpoints — the client uniformly branches on `res.ok` and shows `res.message`.

**QR deep links.** `api/admin/list.js` computes `baseUrl` from `x-forwarded-proto` + `x-forwarded-host` headers (set by Vercel) and produces `<baseUrl>/?umbrella=<n>` links plus an external `api.qrserver.com` QR image URL. The client parses `INITIAL_UMBRELLA` from `location.search` and auto-runs `doScan()` if present — that is the QR-scan entry path.

## Configuration

**Environment variables** (set in Vercel dashboard, Settings → Environment Variables):
- `ADMIN_PASSWORD` — **required**. The shared admin password.
- `POSTGRES_URL` and friends — **auto-injected** when you connect Vercel Postgres to the project.

**Code-level constants** (`lib/utils.js`):
- `OVERDUE_HOURS = 24`
- `TIMEZONE = 'Asia/Seoul'`

Changes here ship via `git push`.

## Conventions when extending

- New API route: add a file under `api/` (or `api/admin/` if it needs auth). Export `default async function handler(req, res)`. Check `req.method`, validate input, return `{ok, message?, ...}`. For admin routes, start with `if (!requireAdmin(req, res)) return;`.
- New schema change: add to `db/schema.sql` and document in `README.md`. Apply manually via the Postgres console. There's no migration tool — this app is small enough that ad-hoc SQL is the path.
- Don't introduce a framework (Next.js, React) unless the user explicitly asks. The single-file vanilla frontend is intentional.
- Don't add a build step. `vercel.json` is minimal on purpose.
- Don't reintroduce GAS-style globals (`SpreadsheetApp`, `LockService`, etc.) — the migration off those was the whole point.
