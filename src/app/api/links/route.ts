import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidSlug, generateSlug } from '@/lib/slug'
import { verifyApiKeyRequest, unauthorizedResponse } from '@/lib/auth-api'

/**
 * POST /api/links
 * Create a new short link.
 *
 * Auth: requires API key (Authorization: Bearer csk_xxx or X-API-Key)
 *
 * Body:
 *   url: string (required, must be valid URL)
 *   slug?: string (custom slug)
 *   title?: string
 *   description?: string
 *   comment?: string
 *   expiresAt?: string (ISO date)
 *
 * Returns: 201 { id, slug, url, shortUrl, title, createdAt }
 *          400 { error }
 *          401 { error }
 *          409 { error: 'Slug already taken' }
 */
export async function POST(request: NextRequest) {
  const auth = await verifyApiKeyRequest(request)
  if (!auth.ok) return unauthorizedResponse(auth.error)

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { url, slug, title, description, comment, expiresAt } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http/https URLs are allowed')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let finalSlug: string | undefined
  if (slug) {
    if (typeof slug !== 'string' || !isValidSlug(slug)) {
      return NextResponse.json({
        error: 'Invalid slug. Use only letters, numbers, and hyphens (max 64 chars). Reserved words not allowed.'
      }, { status: 400 })
    }
    finalSlug = slug.toLowerCase()

    const existing = await db.link.findUnique({ where: { slug: finalSlug }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug()
      const exists = await db.link.findUnique({ where: { slug: candidate }, select: { id: true } })
      if (!exists) {
        finalSlug = candidate
        break
      }
    }
    if (!finalSlug) {
      return NextResponse.json({ error: 'Could not generate unique slug, try again' }, { status: 500 })
    }
  }

  let expiresAtDate: Date | null = null
  if (expiresAt) {
    const d = new Date(expiresAt)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 })
    }
    expiresAtDate = d
  }

  const link = await db.link.create({
    data: {
      slug: finalSlug,
      url: parsedUrl.toString(),
      title: title?.slice(0, 256) || null,
      description: description?.slice(0, 2048) || null,
      comment: comment?.slice(0, 2048) || null,
      expiresAt: expiresAtDate,
      apiKeyId: auth.apiKey!.id,
      createdById: auth.apiKey!.adminUserId,
    },
    select: {
      id: true,
      slug: true,
      url: true,
      title: true,
      description: true,
      comment: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const shortUrl = `${siteUrl.replace(/\/$/, '')}/${link.slug}`

  return NextResponse.json({ ...link, shortUrl }, { status: 201 })
}

/**
 * GET /api/links
 * List all links (paginated).
 *
 * Query params:
 *   limit: number (default 50, max 100)
 *   cursor: string
 *   search: string
 */
export async function GET(request: NextRequest) {
  const auth = await verifyApiKeyRequest(request)
  if (!auth.ok) return unauthorizedResponse(auth.error)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const cursor = searchParams.get('cursor') || undefined
  const search = searchParams.get('search') || undefined

  const links = await db.link.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: search ? {
      OR: [
        { slug: { contains: search } },
        { url: { contains: search } },
        { title: { contains: search } },
      ]
    } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      url: true,
      title: true,
      comment: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { clicks: true } },
    },
  })

  const hasMore = links.length > limit
  const items = hasMore ? links.slice(0, limit) : links
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    links: items,
    nextCursor,
    hasMore,
  })
}
