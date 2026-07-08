import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * GET /api/admin/clicks
 * List click logs (optionally filtered by link).
 *
 * Query:
 *   linkId (filter by link)
 *   limit (default 50, max 200)
 *   cursor
 *   ip (substring filter)
 *   country (substring filter)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const cursor = searchParams.get('cursor') || undefined
  const linkId = searchParams.get('linkId') || undefined
  const ipFilter = searchParams.get('ip') || undefined
  const countryFilter = searchParams.get('country') || undefined

  const where: any = {}
  if (linkId) where.linkId = linkId
  if (ipFilter) where.ip = { contains: ipFilter }
  if (countryFilter) where.country = { contains: countryFilter }

  const clicks = await db.click.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, ip: true, userAgent: true, referer: true,
      country: true, city: true, region: true,
      browser: true, os: true, device: true,
      createdAt: true,
      link: { select: { id: true, slug: true, url: true } },
    },
  })

  const hasMore = clicks.length > limit
  const items = hasMore ? clicks.slice(0, limit) : clicks
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    clicks: items,
    nextCursor,
    hasMore,
  })
}

/**
 * DELETE /api/admin/clicks
 * Bulk delete click logs.
 *
 * Query (any combination):
 *   linkId — delete all clicks for a link
 *   before — delete clicks older than this ISO date
 *   all=true — delete ALL click logs (use with caution!)
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const linkId = searchParams.get('linkId')
  const before = searchParams.get('before')
  const all = searchParams.get('all') === 'true'

  if (!linkId && !before && !all) {
    return NextResponse.json({
      error: 'Must specify linkId, before (ISO date), or all=true'
    }, { status: 400 })
  }

  const where: any = {}
  if (linkId) where.linkId = linkId
  if (before) {
    const d = new Date(before)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid before date' }, { status: 400 })
    }
    where.createdAt = { lt: d }
  }

  const result = await db.click.deleteMany({ where })
  return NextResponse.json({ deleted: result.count })
}
