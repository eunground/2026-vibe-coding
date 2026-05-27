# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A school umbrella-rental web app built entirely on **Google Apps Script (GAS)** with **Google Sheets as the database**. There is no Node/npm project, no build step, and no local runtime — the code only executes inside Google's infrastructure once deployed as a Web App. The UI is in Korean.

## Files & how GAS maps them

| Local file | GAS file (name to use in editor) | Role |
| --- | --- | --- |
| `Code.gs` | `Code.gs` | Server-side backend (V8 runtime) |
| `Index.html` | `Index` | Main HTML, served by `doGet` |
| `Stylesheet.html` | `Stylesheet` | CSS, pulled in via `include('Stylesheet')` |
| `JavaScript.html` | `JavaScript` | Client JS, pulled in via `include('JavaScript')` |
| `appsscript.json` | manifest | Web app access = `ANYONE_ANONYMOUS`, executeAs = `USER_DEPLOYING` |

**Critical:** in the Apps Script editor the three HTML files must be named **without** the `.html` suffix (`Index`, `Stylesheet`, `JavaScript`). `include()` and `createTemplateFromFile('Index')` reference those exact names.

## No local build/test/run

You cannot run or lint this app locally — it needs `SpreadsheetApp`, `HtmlService`, etc. To validate changes before deploying:

- **Syntax-check** `Code.gs`: `cp Code.gs /tmp/c.js && node --check /tmp/c.js` (checks parse only; GAS globals are undefined locally).
- **Syntax-check** the client JS: strip the `<script>` wrapper from `JavaScript.html` and `node --check` the result.
- **Real verification requires deploying** (see `README.md`): paste into an Apps Script project bound to a Sheet, then *Deploy → New deployment → Web app*. Each code change needs a new deployment version to take effect at the `/exec` URL.

## Architecture (the non-obvious parts)

**Request entry.** `doGet(e)` calls `setupSheets_()` (idempotent bootstrap) on every load, then renders `Index` as a templated `HtmlOutput`. A `?umbrella=<n>` query param is injected into the page as `INITIAL_UMBRELLA`; the client auto-runs a lookup on load — this is the QR-code deep-link path.

**Self-bootstrapping DB.** `getSpreadsheet_()` works in two modes: container-bound (`getActiveSpreadsheet()`) or standalone (creates a spreadsheet once and remembers its id in `PropertiesService` under `SPREADSHEET_ID`). `setupSheets_()` / `ensureSheet_()` create the two sheets and (re)write headers if missing. Never assume the sheets/headers exist — go through these helpers.

**Two sheets, status is derived not stored.**
- `우산목록` (umbrella list): 우산번호 · 우산명 · 등록일 — the registry of umbrellas.
- `대여현황` (rentals): 우산번호 · 학생이름 · 학번 · 전화번호 · 대여시간 · 반납시간 · 상태 — an append-only-ish log. Each rental is a new row with 상태=`대여중`; returning sets 반납시간 + 상태=`반납완료`.
- An umbrella's current state (`available`/`rented`/`overdue`) is computed by scanning `대여현황` for a `대여중` row (`findActiveRental_`), **not** stored on the umbrella. "Overdue" = a `대여중` row older than `OVERDUE_HOURS`.

**Column access.** `대여현황` columns are addressed through the `C` index constant (`C.NUMBER`, `C.RENT`, etc.). If you change the sheet schema, update both `RENTAL_HEADERS` and `C` together. Sheet writes use 1-based ranges, so `getRange(row, C.STATUS + 1)`.

**Stateless admin auth.** GAS has no session here. `adminLogin(pw)` only validates against the `ADMIN_PASSWORD` constant; on success the client keeps the password in the `adminPassword` JS variable and **passes it as the first argument to every admin call** (`getAdminStats`, `forceReturn`, `registerUmbrella`, etc.). Every admin server function re-checks via `checkAdmin_(password)` and returns `{ ok:false }` on failure; the client treats that as auth loss (`handleAuthFail` → back to scan tab).

**Client/server contract.** The client wraps `google.script.run` in a Promise via the `call(fnName, ...args)` helper. Server functions return plain objects, almost always shaped `{ ok: boolean, message?, ...data }`. Keep that shape when adding endpoints.

**Concurrency.** Mutating operations (`rentUmbrella`, `returnUmbrella`) take a `LockService` script lock to prevent double-rent races. Add the same guard to any new write path.

**Privacy.** Student-facing status masks the renter name (`maskName_`) and omits phone; admin views show full data. Preserve that split.

**UI shape.** Single page, four tabs (`scan` / `status` / `manage` / `history`). Only `scan` is public; the other three route through an inline password gate (`pendingAdminTab`). Tab → view switching is done by `switchTab` / `showOnlyView` toggling both the `.active` class and inline `display`. Status colors (green=available, orange=rented, red=overdue) are convention throughout CSS and badges.

## Configuration

Top of `Code.gs`: `ADMIN_PASSWORD` (change before any real use), `OVERDUE_HOURS` (24), `TIMEZONE` (`Asia/Seoul`). QR images come from the external `api.qrserver.com` service, encoding `<webAppUrl>?umbrella=<n>`; the web-app URL is only available after deployment (`getWebAppUrl_()` returns empty until then, so QR generation no-ops pre-deploy).
