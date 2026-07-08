# HANDOFF — CyberShare URL Shortener

> **Last updated:** 2026-07-09
> **Repo:** https://github.com/dustindog101/cybershare-shortener
> **Branch:** `main` (latest commit: `b3190d2`)
> **Local path:** `/home/z/my-project`

---

## 1. What this project is

A self-hosted URL shortener inspired by [Sink](https://github.com/miantiao-me/Sink), built for Vercel free tier. Accepts links via:
- **Public homepage** (`/`) — paste a URL + API key
- **REST API** (`/api/links`) — programmatic creation with `csk_` API keys
- **Admin dashboard** (`/admin/*`) — full CRUD + analytics + IP logging controls

## 2. Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| DB / ORM | Prisma + SQLite (local dev) / Postgres (production via Neon) |
| UI | shadcn/ui, Tailwind CSS 4, Recharts |
| Auth (admin sessions) | `jose` (JWT, edge-compatible) |
| Auth (passwords) | `bcryptjs` |
| Auth (API keys) | SHA-256 hashed, `csk_` prefix (Dub.co pattern) |
| Click logging | `@vercel/functions` `waitUntil` (fire-and-forget, doesn't block redirect) |
| Package manager | `bun` (lockfile committed) |
| Deployment target | Vercel Hobby (free tier) |

## 3. Quick commands

```bash
# Install deps
bun install

# Start dev server (auto-restarts on file change)
bun run dev                  # → http://localhost:3000

# Push schema changes to DB
bun run db:push

# Regenerate Prisma client after schema edits
bun run db:generate

# Lint
bun run lint

# Production build (DO NOT run in this sandbox — use dev)
# bun run build
```

## 4. Current state — what's built and working

### Routes (all tested via Agent Browser)

| Path | Auth | Purpose |
|------|------|---------|
| `/` | Public | Homepage with link-shortener form (requires API key) |
| `/[slug]` | Public | **Redirect handler** — 302 to target URL + fire-and-forget click log |
| `/login` | Public | Admin login (first-visit shows setup form if no admin exists) |
| `/unlock` | Public | Password-protected link unlock page (skeleton — not fully wired) |
| `/admin` | Admin session* | Dashboard overview — usage bars, 30-day chart, top links, breakdowns |
| `/admin/links` | Admin session* | Links list with search, CRUD, IP toggle (shield icon), Eye icon → detail |
| `/admin/links/[id]` | Admin session* | **Per-link detail** — chart, breakdowns, click log table, IP toggle, delete |
| `/admin/logs` | Admin session* | **Global click logs** — every click, filters, expandable rows |
| `/admin/analytics` | Admin session* | Charts: time series, devices pie, browsers bar, breakdowns |
| `/admin/security` | Admin session* | Admin login attempts log with IP/UA/geo, filters, delete |
| `/admin/api-keys` | Admin session* | Generate/revoke `csk_` API keys (one-time reveal) |
| `/admin/settings` | Admin session* | Global IP toggle, log management (delete by date/all), env docs |

*See "⚠️ CRITICAL: Auth bypass is currently ON" below.

### API endpoints

**Public (no auth):**
- `GET /api/health` — DB ping
- `GET /[slug]` — redirect (this is the route handler, not under `/api`)
- `POST /api/admin/setup` — one-time first admin creation (only works if no admin exists)
- `GET /api/admin/setup` — returns `{ needsSetup: boolean }`

**Admin session auth (cookie-based):**
- `POST /api/auth/login` — body `{email, password}` → sets `cs_admin_session` cookie
- `DELETE /api/auth/login` — logout
- `GET /api/admin/links` — list with cursor pagination + search
- `POST /api/admin/links` — create
- `GET /api/admin/links/[id]` — single link detail
- `PATCH /api/admin/links/[id]` — update (supports `ipLoggingDisabled`, `isActive`, `url`, `title`, etc.)
- `DELETE /api/admin/links/[id]?hard=true` — soft (default) or hard delete
- `GET /api/admin/clicks?linkId=&ip=&country=&cursor=&limit=` — list click logs
- `DELETE /api/admin/clicks?linkId=&before=&all=true` — bulk delete (must specify at least one filter)
- `DELETE /api/admin/clicks/[id]` — delete single click log
- `GET /api/admin/login-attempts?email=&ip=&success=&cursor=&limit=` — list login audit
- `DELETE /api/admin/login-attempts/[id]` — delete single login attempt
- `GET /api/admin/api-keys` — list current admin's API keys
- `POST /api/admin/api-keys` — generate new key (returns raw key ONCE)
- `DELETE /api/admin/api-keys/[id]` — revoke
- `GET /api/admin/stats/overview` — aggregated stats for dashboard
- `GET /api/admin/usage` — free-tier usage estimates (Vercel + Neon thresholds)
- `GET /api/admin/settings` — returns `{ globalIpLogging, logAdminLogins }`
- `PATCH /api/admin/settings` — update those settings

**API key auth (`Authorization: Bearer csk_xxx` or `X-API-Key: csk_xxx`):**
- `POST /api/links` — create link (body: `{url, slug?, title?, description?, comment?, expiresAt?}`)
- `GET /api/links?limit=&cursor=&search=` — list links
- `GET /api/links/[slug]` — get single link
- `DELETE /api/links/[slug]?hard=true` — delete
- `GET /api/stats/overview` — same data as admin version but API-key auth

### Database schema (`prisma/schema.prisma`)

```
AdminUser      — id, email, password (bcrypt), name, timestamps
ApiKey         — id, name, hashedKey (sha256), partialKey, expiresAt, lastUsedAt,
                 revokedAt, adminUserId, timestamps
Link           — id, slug (unique), url, title, description, image, comment,
                 password (PBKDF2 hash, NOT IMPLEMENTED), expiresAt, isActive,
                 ipLoggingDisabled (NEW), createdById, apiKeyId, timestamps
Click          — id, linkId, ip (hashed or null), userAgent, referer,
                 country, city, region, browser, os, device, createdAt
LoginAttempt   — id, email, success, ip (RAW — security audit), userAgent,
                 country, city, region, browser, os, device, error, adminId, createdAt
Setting        — key (PK), value (string), updatedAt  (for globalIpLogging, logAdminLogins)
```

## 5. ⚠️ CRITICAL: Auth bypass is currently ON

The preview environment (preview-<bot-id>.space-z.ai) strips cookies on cross-origin redirects, so the admin login flow appeared "stuck" — login succeeded but the session cookie didn't survive the redirect to `/admin`.

**Temporary workaround (currently active):**
- `src/app/admin/layout.tsx` — `AUTO_LOGIN_BYPASS = true` block auto-logs in as the first admin user
- `src/lib/auth-admin.ts` — `AUTH_BYPASS_ENABLED = true` makes all admin API routes auto-authenticate

**To re-enable real auth (REQUIRED before production deploy):**
1. In `src/app/admin/layout.tsx` — delete the `AUTO_LOGIN_BYPASS` block (clearly marked with warning comments)
2. In `src/lib/auth-admin.ts` — set `AUTH_BYPASS_ENABLED = false`

The actual cookie bug is specific to the preview proxy. On a real Vercel deployment with a custom domain, `SameSite=Lax` works fine for same-site navigation — the bug won't reproduce there.

## 6. ⚠️ CRITICAL: Schema must switch to Postgres for production

SQLite doesn't work on Vercel serverless (no persistent filesystem).

**Before deploying to Vercel:**
1. Edit `prisma/schema.prisma` line 9:
   ```diff
   datasource db {
   -  provider = "sqlite"
   +  provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Create a free Neon Postgres DB at https://neon.tech
3. Set env vars in Vercel:
   - `DATABASE_URL` = Neon connection string
   - `NEXTAUTH_SECRET` = `openssl rand -base64 32`
   - `SITE_URL` = `https://your-domain.com`
4. Run `prisma db push` against the Neon DB to create tables
5. Deploy

Full instructions in `DEPLOYMENT.md`.

## 7. Local dev credentials (SQLite only — won't exist on Vercel)

- **URL:** http://localhost:3000/admin (or `/login`)
- **Email:** `admin@cybershare.tech`
- **Password:** `testpassword123`

DB file: `db/custom.db` (gitignored). To reset: `bun run db:reset` or delete the file and `bun run db:push`.

## 8. Env vars

```bash
# Local dev (.env — already created, gitignored)
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="local-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
SITE_URL="http://localhost:3000"

# Production (Vercel)
DATABASE_URL="postgresql://..."  # Neon
NEXTAUTH_SECRET="<random 32+ char string>"
SITE_URL="https://short.cybershare.tech"

# Optional (for live usage metrics in dashboard)
VERCEL_TOKEN="<vercel token with read scope>"
NEON_API_KEY="<neon api key>"
```

## 9. Project structure (key files only)

```
prisma/
  schema.prisma              ← DB schema (6 models)

src/
  app/
    [slug]/route.ts          ← Redirect handler + click logging
    admin/
      layout.tsx             ← Auth guard (HAS BYPASS — see §5)
      page.tsx               ← Overview dashboard
      links/
        page.tsx             ← Links list (clickable rows + Eye icon)
        [id]/page.tsx        ← Per-link detail + click log
      logs/page.tsx          ← Global click logs
      analytics/page.tsx     ← Charts
      security/page.tsx      ← Login attempts log
      api-keys/page.tsx      ← API key management
      settings/page.tsx      ← Global settings + log management
    api/
      auth/login/route.ts    ← Admin login (logs every attempt)
      admin/                 ← All admin endpoints (see §4)
      links/route.ts         ← Public API (API-key auth)
      links/[slug]/route.ts
      stats/overview/route.ts
      health/route.ts
    login/page.tsx           ← Login form + setup form
    unlock/page.tsx          ← Password-protected link unlock (skeleton)
    page.tsx                 ← Homepage link shortener form
    layout.tsx               ← Root layout + metadata

  components/
    admin/AdminShell.tsx     ← Sidebar nav + PageHeader + Card + StatCard
    ui/                      ← shadcn/ui components (do not edit)

  lib/
    db.ts                    ← Prisma client singleton
    slug.ts                  ← nanoid alphabet (no ambiguous chars), reserved slugs
    api-key.ts               ← csk_ key generation + SHA-256 hashing
    auth-api.ts              ← API key verification for /api/links
    auth-admin.ts            ← Admin session check (HAS BYPASS — see §5)
    auth-session.ts          ← jose JWT + bcrypt password helpers
    settings.ts              ← Setting table helpers (getSettingBool, setSettingBool)
    request-context.ts       ← Extract IP, UA, geo from NextRequest
    utils.ts                 ← cn() class merge helper

vercel.json                  ← Build command: prisma generate && next build
DEPLOYMENT.md                ← Step-by-step Vercel + Neon deploy guide
README.md                    ← Project overview
```

## 10. What's NOT done (follow-up work)

### High priority
1. **Revert auth bypass** (§5) — must do before production
2. **Switch to Postgres** (§6) — must do before Vercel deploy
3. **Password-protected links** — `/unlock` page exists but doesn't verify against `Link.password` (PBKDF2 hash). Need an API endpoint `POST /api/link/[slug]/unlock` that verifies password and sets a short-lived cookie, then redirects. `Link.password` field is in the schema but never set/written.
4. **OG metadata for social bots** — Sink serves static HTML with OG tags to Twitter/Facebook/Slack bots instead of redirecting. Not implemented here. Would require detecting bot user-agents in `src/app/[slug]/route.ts` and rendering a small HTML page.

### Medium priority
5. **Live Vercel usage metrics** — `/api/admin/usage` returns estimates based on app DB. Wire in real Vercel API calls using `VERCEL_TOKEN` env var. Endpoint to call: `GET https://api.vercel.com/v2/usage` (requires team ID).
6. **Live Neon storage metrics** — Same, using `NEON_API_KEY`. Endpoint: `GET https://console.neon.tech/api/v2/projects/{project_id}/usage`.
7. **Rate limiting** — No rate limiting on `/api/links` POST or `/[slug]` GET. Could add `@upstash/ratelimit` (free 10K req/day).
8. **QR codes** — Sink generates QR codes per link. Easy to add: use `qrcode` npm package, render in per-link detail page.
9. **Custom domains UI** — `vercel.json` doesn't configure custom domains. User adds them via Vercel dashboard. Could add a Settings page section that calls Vercel API to add domains programmatically.

### Low priority
10. **Cron job for Edge Config sync** — Sink-style fast redirect cache. Edge Config has 100 writes/month limit on free tier, so sync via daily cron. Only worth it if redirect latency becomes an issue.
11. **Tinybird migration** — If click volume exceeds ~1K/day, move click logging from Postgres to Tinybird (ClickHouse, free 10GB) to avoid burning Neon compute hours.
12. **Multi-user admin** — Currently single-admin. `AdminUser` model supports multiple, but no UI to invite/manage users.
13. **Bulk link import/export** — Sink has JSON import/export. Easy to add: `GET /api/admin/links/export` returns JSON, `POST /api/admin/links/import` accepts it.
14. **Link tags/folders** — For organizing many links.
15. **Webhooks** — Fire webhook on link creation/click for external integrations.

## 11. Known issues / gotchas

1. **Auth bypass is ON** (see §5) — every visitor to `/admin` is auto-logged in as the first admin user. Revert before production.
2. **SQLite locally, Postgres in prod** — Schema is identical, but `bun run db:push` only affects the local DB. Production needs its own `db push` against Neon.
3. **Click log volume** — Each click writes one row to the `Click` table. At scale (>1K clicks/day), this burns Neon compute hours. Migrate to Tinybird when needed (§10 item 11).
4. **Fire-and-forget logging** — `src/app/[slug]/route.ts` uses `waitUntil()` from `@vercel/functions`. If the Vercel function is killed before the DB write completes, the click is lost. This is acceptable for analytics but not for billing-critical use cases.
5. **IP hashing** — Click IPs are SHA-256 hashed with `NEXTAUTH_SECRET` as salt, truncated to 16 chars. Cannot be reversed. Admin login attempt IPs are stored RAW (unhashed) for security audit.
6. **Login attempt logging** — Every admin login (success or failure) is logged in `LoginAttempt` table with raw IP. Toggle via Settings → "Log admin login attempts".
7. **Reserved slugs** — `src/lib/slug.ts` has a `RESERVED_SLUGS` set (`admin`, `api`, `login`, etc.) that can't be used as short links. Add more if needed.
8. **Slug alphabet** — Uses `23456789abcdefghjkmnpqrstuvwxyz` (no `0`, `1`, `o`, `l`, `i` for readability). Length 6 by default.

## 12. How to test locally

```bash
# 1. Start dev server
bun run dev

# 2. Visit http://localhost:3000 — homepage should render

# 3. Visit http://localhost:3000/admin — auto-logged in (bypass is on)

# 4. Create an API key at /admin/api-keys (copy the csk_xxx value)

# 5. Test the API
curl -X POST http://localhost:3000/api/links \
  -H "Authorization: Bearer csk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "slug": "test"}'

# 6. Test the redirect
curl -sI http://localhost:3000/test

# 7. View click logs at /admin/logs or /admin/links/<id>

# 8. Test login attempt logging
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cybershare.tech","password":"wrong"}'
# Then check /admin/security
```

## 13. Commit history (most recent first)

```
b3190d2  Add Click Logs page + per-link detail view
31d14a8  TEMPORARY: bypass auth for dashboard review
e43bc54  Fix: admin login stuck on login page
d5ce1b8  Add IP logging controls + admin login audit + log management
27244a6  Add deployment guide
4fc57ef  Initial commit: CyberShare URL shortener
```

## 14. Security reminders

1. **Revoke the GitHub + Vercel tokens the user shared earlier** — they were pasted in plain text in the conversation. Even though the GitHub token is no longer in the git remote URL, it should still be rotated.
2. **Rotate `NEXTAUTH_SECRET`** before production — the local dev value is in `.env` (gitignored, but still).
3. **Revert auth bypass** (§5) before any public deploy.
4. **Admin login IPs are stored unhashed** — this is intentional for security audit, but make sure the production DB is access-controlled.

## 15. If you're a new agent picking this up

1. Read this entire file first.
2. Read `DEPLOYMENT.md` for Vercel deploy steps.
3. Read `prisma/schema.prisma` to understand the data model.
4. Read `src/app/[slug]/route.ts` to understand the redirect + click logging flow.
5. Read `src/lib/auth-admin.ts` to see the bypass you need to revert.
6. Run `bun install && bun run db:push && bun run dev` to start.
7. Visit http://localhost:3000/admin — you'll be auto-logged in.
8. Pick a task from §10 (probably "revert auth bypass" or "password-protected links").

Good luck. 🚀
