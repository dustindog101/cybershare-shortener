import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKeyRequest, unauthorizedResponse } from '@/lib/auth-api'

/**
 * GET /api/stats/overview
 * Returns high-level stats for the dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyApiKeyRequest(request)
  if (!auth.ok) return unauthorizedResponse(auth.error)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalLinks, activeLinks, totalClicks, clicksThisMonth, clicksToday, clicksLast7Days,
    topLinksAgg,
  ] = await Promise.all([
    db.link.count(),
    db.link.count({ where: { isActive: true } }),
    db.click.count(),
    db.click.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.click.count({ where: { createdAt: { gte: startOfDay } } }),
    db.click.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.link.findMany({
      take: 10,
      orderBy: { clicks: { _count: 'desc' } },
      select: {
        id: true, slug: true, url: true, title: true, createdAt: true,
        _count: { select: { clicks: true } },
      },
    }),
  ])

  // Last 30 days timeseries
  const recentClicks = await db.click.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, country: true, browser: true, os: true, device: true, referer: true },
  })

  const byDay: Record<string, number> = {}
  for (const c of recentClicks) {
    const d = new Date(c.createdAt).toISOString().slice(0, 10)
    byDay[d] = (byDay[d] || 0) + 1
  }

  function tally(field: 'country' | 'browser' | 'os' | 'device' | 'referer'): { label: string; count: number }[] {
    const map = new Map<string, number>()
    for (const c of recentClicks) {
      const v = (c[field] as string) || 'Unknown'
      map.set(v, (map.get(v) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  return NextResponse.json({
    totals: {
      links: totalLinks,
      activeLinks,
      clicks: totalClicks,
      clicksThisMonth,
      clicksToday,
      clicksLast7Days,
    },
    timeseries: { last30Days: byDay },
    topLinks: topLinksAgg.map(l => ({
      id: l.id, slug: l.slug, url: l.url, title: l.title,
      clicks: l._count.clicks, createdAt: l.createdAt,
    })),
    breakdowns: {
      countries: tally('country'),
      browsers: tally('browser'),
      os: tally('os'),
      devices: tally('device'),
      referers: tally('referer'),
    },
  })
}
