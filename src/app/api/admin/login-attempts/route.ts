import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * GET /api/admin/login-attempts
 * List admin login attempts with optional filters.
 *
 * Query params:
 *   limit (default 50, max 200)
 *   cursor (string, cursor pagination)
 *   success (true|false|all)
 *   email (filter by email substring)
 *   ip (filter by IP substring)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const cursor = searchParams.get('cursor') || undefined
  const successFilter = searchParams.get('success')
  const emailFilter = searchParams.get('email') || undefined
  const ipFilter = searchParams.get('ip') || undefined

  const where: any = {}
  if (successFilter === 'true') where.success = true
  if (successFilter === 'false') where.success = false
  if (emailFilter) where.email = { contains: emailFilter }
  if (ipFilter) where.ip = { contains: ipFilter }

  const attempts = await db.loginAttempt.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, success: true, error: true,
      ip: true, userAgent: true,
      country: true, city: true, region: true,
      browser: true, os: true, device: true,
      adminId: true, createdAt: true,
    },
  })

  const hasMore = attempts.length > limit
  const items = hasMore ? attempts.slice(0, limit) : attempts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    attempts: items,
    nextCursor,
    hasMore,
  })
}
