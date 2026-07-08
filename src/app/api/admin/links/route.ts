import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'
import { generateSlug, isValidSlug } from '@/lib/slug'

/**
 * GET /api/admin/links
 * List links with pagination and search.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const cursor = searchParams.get('cursor') || undefined
  const search = searchParams.get('search') || undefined
  const activeOnly = searchParams.get('active') === 'true'

  const links = await db.link.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(search ? {
        OR: [
          { slug: { contains: search } },
          { url: { contains: search } },
          { title: { contains: search } },
        ]
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true, url: true, title: true, comment: true,
      isActive: true, ipLoggingDisabled: true, expiresAt: true, createdAt: true, updatedAt: true,
      _count: { select: { clicks: true } },
    },
  })

  const hasMore = links.length > limit
  const items = hasMore ? links.slice(0, limit) : links
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ links: items, nextCursor, hasMore })
}

/**
 * POST /api/admin/links
 * Create a new link from the admin dashboard (no API key needed, uses admin session).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url, slug, title, description, comment, expiresAt } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let finalSlug: string | undefined
  if (slug) {
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }
    finalSlug = slug.toLowerCase()
    const existing = await db.link.findUnique({ where: { slug: finalSlug }, select: { id: true } })
    if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
  } else {
    for (let i = 0; i < 5; i++) {
      const c = generateSlug()
      if (!await db.link.findUnique({ where: { slug: c }, select: { id: true } })) {
        finalSlug = c
        break
      }
    }
    if (!finalSlug) return NextResponse.json({ error: 'Slug generation failed' }, { status: 500 })
  }

  let expiresAtDate: Date | null = null
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt)
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 })
    }
  }

  const link = await db.link.create({
    data: {
      slug: finalSlug,
      url: parsedUrl.toString(),
      title: title?.slice(0, 256) || null,
      description: description?.slice(0, 2048) || null,
      comment: comment?.slice(0, 2048) || null,
      expiresAt: expiresAtDate,
      createdById: auth.admin.adminId,
    },
  })

  const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return NextResponse.json({
    ...link,
    shortUrl: `${siteUrl.replace(/\/$/, '')}/${link.slug}`,
  }, { status: 201 })
}
