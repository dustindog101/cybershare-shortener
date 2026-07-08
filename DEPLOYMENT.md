# Deployment Guide — CyberShare URL Shortener

## Status

- ✅ **Code complete** — all features built and tested locally
- ✅ **Pushed to GitHub** — `dustindog101/cybershare-shortener`
- ⚠️ **Vercel deployment pending** — the provided Vercel token has SAML SSO restrictions on your `dustin-hartles-projects` scope and cannot create projects via API. You'll need to deploy via the Vercel dashboard (2 minutes) OR re-create the token with SSO authorization.

---

## Option A — Deploy via Vercel Dashboard (Recommended, 2 min)

1. **Go to** https://vercel.com/new
2. **Import** the `dustindog101/cybershare-shortener` repo
3. **Framework preset**: Next.js (auto-detected)
4. **Build command**: `prisma generate && next build` (already in `vercel.json`)
5. **Install command**: `bun install` (or `npm install`)
6. **Add environment variables** (see below)
7. **Deploy**

After deploy, Vercel runs `prisma generate && next build`. The first deploy may fail because the Prisma schema is set to SQLite — **you must switch to Postgres first** (see "Switch to Postgres" below).

---

## Switch to Postgres (Required for Vercel)

SQLite doesn't work on Vercel serverless (no persistent filesystem).

### 1. Create a free Neon Postgres database

1. Go to https://neon.tech → Sign up (free)
2. Create a new project (any name, any region close to Vercel's default — Washington DC / US East)
3. Copy the **connection string** (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Update the Prisma schema

In your local repo, edit `prisma/schema.prisma`:

```diff
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Set environment variables in Vercel

In your Vercel project → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...` (your Neon connection string) |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `SITE_URL` | `https://your-project.vercel.app` (update later when you add custom domain) |

### 4. Commit the schema change and push

```bash
git add prisma/schema.prisma
git commit -m "Switch Prisma to Postgres for Vercel deployment"
git push
```

Vercel will auto-redeploy. The build runs `prisma generate && next build`, but you also need `prisma db push` to create tables.

### 5. Run prisma db push

The easiest way: install Vercel CLI locally and run:

```bash
npm i -g vercel
vercel link  # link to your project
vercel env pull .env.production.local  # pulls DATABASE_URL into local env
npx prisma db push  # creates tables in Neon
```

Or run `npx prisma db push` from any machine with `DATABASE_URL` set to your Neon string.

### 6. Verify

Visit your Vercel URL → `/api/health` should return `{"status":"ok","db":"connected"}`.

Visit `/admin` → create your admin account → create an API key → shorten a URL!

---

## Option B — Re-authorize Vercel token for automated deployment

If you want me to redeploy via API:

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. **IMPORTANT**: Before creating, click "Authorize SSO" or select the `dustin-hartles-projects` scope — the previous token missed this step
4. Copy the new token
5. Share it with me and I'll deploy automatically

---

## Custom Domains (after deploy works)

### Main shortener domain (`short.cybershare.tech` or `link.cybershare.tech`)

1. In Vercel project → Settings → Domains
2. Add `short.cybershare.tech`
3. At your DNS provider (Cloudflare, Namecheap, etc.), add:
   - **CNAME** record: `short` → `cname.vercel-dns.com` (or follow Vercel's instructions)
4. Wait for DNS propagation (5 min – 1 hour)
5. Update `SITE_URL` env var to `https://short.cybershare.tech`
6. Redeploy

### Admin subdomain (`admin.cybershare.tech`)

Optional. Add it as another domain in Vercel pointing to the same project. Next.js will serve `/admin` automatically on any domain pointing to the project. You can then visit `https://admin.cybershare.tech/admin` directly.

---

## Enable live usage metrics (optional)

To pull real-time Vercel + Neon usage in the admin dashboard (instead of estimates):

1. Get a **Vercel token** with read access (https://vercel.com/account/tokens)
2. Get a **Neon API key** (Neon dashboard → Account → API keys)
3. Add as env vars: `VERCEL_TOKEN`, `NEON_API_KEY`
4. The `/api/admin/usage` endpoint will start returning live data

(Wiring these up is left as a follow-up — the dashboard shows estimates for now.)

---

## What you can do right now

The app is **fully functional locally**. You can:

```bash
# Local dev
bun run dev
# Visit http://localhost:3000 → /admin (already set up: admin@cybershare.tech / testpassword123)
# Create an API key at /admin/api-keys
# Shorten URLs at http://localhost:3000

# Or test the API
curl -X POST http://localhost:3000/api/links \
  -H "Authorization: Bearer csk_..." \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

For production: follow **Option A** above (5-minute Vercel dashboard deploy after switching to Postgres).
