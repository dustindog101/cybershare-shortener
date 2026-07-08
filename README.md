# CyberShare — URL Shortener

A fast, self-hosted URL shortener inspired by [Sink](https://github.com/miantiao-me/Sink), built for **Vercel free tier** with Next.js 16, Prisma, and a clean admin dashboard.

## Features

- **Sub-50ms redirects** — fire-and-forget click logging via `waitUntil`
- **Admin dashboard** at `/admin` — usage stats, free-tier thresholds, link management
- **API access** with hashed API keys (`csk_...` format) — create links programmatically
- **Public homepage** — shorten URLs from the front-end with an API key
- **Click analytics** — country, browser, OS, device, referer, time-series
- **Free-tier friendly** — designed to stay within Vercel Hobby + Neon free limits
- **Multi-arch DB** — SQLite for local dev, switch to Postgres (Neon) for production

## Quick start

```bash
# Install deps
bun install

# Set up local DB (SQLite)
bun run db:push

# Start dev server
bun run dev
```

Open `http://localhost:3000`. The first time you visit `/admin`, you'll be prompted to create an admin account.

## API usage

Create an API key in the admin dashboard (`/admin/api-keys`), then:

```bash
# Create a link
curl -X POST https://your-domain.com/api/links \
  -H "Authorization: Bearer csk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/long-url", "slug": "my-link"}'

# List links
curl https://your-domain.com/api/links \
  -H "Authorization: Bearer csk_your_key_here"

# Delete a link (soft delete)
curl -X DELETE https://your-domain.com/api/links/my-link \
  -H "Authorization: Bearer csk_your_key_here"
```

The API also accepts `X-API-Key: csk_...` header instead of Bearer auth.

## Deploying to Vercel

### 1. Set up Postgres (Neon)

SQLite doesn't work on Vercel serverless. Use [Neon](https://neon.tech) (free tier):

1. Create a free Neon project
2. Copy the connection string

### 2. Switch Prisma to Postgres

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then commit and push.

### 3. Set environment variables in Vercel

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret (`openssl rand -base64 32`) |
| `SITE_URL` | ✅ | Your domain (e.g. `https://short.cybershare.tech`) |
| `VERCEL_TOKEN` | Optional | For live Vercel usage metrics in dashboard |
| `NEON_API_KEY` | Optional | For live Neon storage metrics in dashboard |

### 4. Deploy

The Vercel build will run `prisma generate` and `prisma db push` automatically (configured in `vercel.json` — create one if needed):

```json
{
  "buildCommand": "prisma generate && next build"
}
```

### 5. Add custom domains

In Vercel project settings → Domains:
- `short.cybershare.tech` (or `link.cybershare.tech`) — main shortener
- `admin.cybershare.tech` — optional, points to same project (Next.js serves `/admin`)

## Architecture

```
┌─────────────────────────────────────────┐
│           Vercel (Next.js 16)            │
│                                          │
│  /[slug]        → 302 redirect + log     │
│  /api/links     → create/list (API key)  │
│  /api/admin/*   → admin session routes   │
│  /admin/*       → dashboard (session)    │
│  /              → public link form       │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     Neon Postgres (free tier)            │
│  - Link, Click, ApiKey, AdminUser        │
└─────────────────────────────────────────┘
```

### Why fire-and-forget click logging?

Each redirect uses `waitUntil()` from `@vercel/functions` to log the click *after* the response is sent. This keeps redirect latency low and doesn't burn serverless CPU time on analytics.

### Why hashed API keys?

Following the Dub.co pattern: API keys are generated as `csk_<random>`, stored as SHA-256 hashes. The raw key is shown **once** at creation time. This means:
- Database leaks don't expose working keys
- Keys can't be retrieved later (only revoked)
- Partial key (last 4 chars) shown in dashboard for identification

## Free tier limits (Vercel Hobby)

The admin dashboard shows live estimates against these limits:

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Serverless function invocations | 1M/month |
| Edge config writes | 100/month |
| Cron jobs | 2 |
| Build minutes | 6000/month |

Neon free tier:

| Resource | Limit |
|----------|-------|
| Storage | 512 MB |
| Compute hours | 100 hours/month |

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Prisma ORM + SQLite (dev) / Postgres (prod)
- **UI**: shadcn/ui, Tailwind CSS 4, Recharts
- **Auth**: jose (JWT) for admin sessions, bcryptjs for passwords, SHA-256 for API keys
- **Analytics**: stored in Postgres (upgrade path to Tinybird for high volume)
- **Deployment**: Vercel

## License

MIT
