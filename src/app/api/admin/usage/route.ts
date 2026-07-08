import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * GET /api/admin/usage
 * Returns usage metrics and free-tier thresholds for:
 * - Vercel Hobby plan (bandwidth, function invocations, edge config, etc.)
 * - Neon Postgres free tier (storage, compute hours)
 * - This app's own usage (links, clicks this month)
 *
 * Note: For live Vercel/Neon usage, you'd need to call their APIs with the user's
 * tokens. We provide static thresholds + this app's actual counts here.
 * The admin can wire in real Vercel API calls later by setting VERCEL_TOKEN.
 */

const VERCEL_FREE_TIER = {
  bandwidth: { limit: 100 * 1024 * 1024 * 1024, label: '100 GB/month', unit: 'GB' },
  edgeFunctionInvocations: { limit: 1_000_000, label: '1M/month', unit: 'calls' },
  serverlessFunctionInvocations: { limit: 1_000_000, label: '1M/month', unit: 'calls' },
  edgeConfigReads: { limit: 100_000, label: '100K/month', unit: 'reads' },
  edgeConfigWrites: { limit: 100, label: '100/month', unit: 'writes' },
  cronJobs: { limit: 2, label: '2 jobs', unit: 'jobs' },
  buildMinutes: { limit: 6000, label: '6000 min/month', unit: 'min' },
  blobStorage: { limit: 1 * 1024 * 1024 * 1024, label: '1 GB', unit: 'GB' },
}

const NEON_FREE_TIER = {
  storage: { limit: 512 * 1024 * 1024, label: '512 MB', unit: 'MB' },
  computeHours: { limit: 100, label: '100 hours/month', unit: 'hours' },
  projects: { limit: 100, label: '100 projects', unit: 'projects' },
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Actual usage from our DB
  const [totalLinks, totalClicks, clicksThisMonth, apiKeysCount, adminCount] = await Promise.all([
    db.link.count(),
    db.click.count(),
    db.click.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.apiKey.count({ where: { revokedAt: null } }),
    db.adminUser.count(),
  ])

  // Estimate DB storage (rough — based on link + click rows)
  // Average row size: ~500 bytes for link, ~300 bytes for click
  const estimatedDbBytes = (totalLinks * 500) + (totalClicks * 300)

  return NextResponse.json({
    app: {
      totalLinks,
      totalClicks,
      clicksThisMonth,
      apiKeysCount,
      adminCount,
      estimatedDbBytes,
    },
    thresholds: {
      vercel: VERCEL_FREE_TIER,
      neon: NEON_FREE_TIER,
    },
    // Estimated app usage against thresholds
    estimated: {
      neonStoragePercent: (estimatedDbBytes / NEON_FREE_TIER.storage.limit) * 100,
      // Each click ≈ 1 serverless function invocation
      vercelFunctionInvocationsPercent: (clicksThisMonth / VERCEL_FREE_TIER.serverlessFunctionInvocations.limit) * 100,
    },
    note: 'These are estimated usage metrics based on this app\'s database. For live Vercel/Neon usage, integrate their APIs by setting VERCEL_TOKEN and NEON_API_KEY env vars.',
  })
}
