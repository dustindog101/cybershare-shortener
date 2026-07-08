import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * GET /api/admin/links/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const link = await db.link.findUnique({
    where: { id },
    select: {
      id: true, slug: true, url: true, title: true, description: true, comment: true,
      isActive: true, ipLoggingDisabled: true, expiresAt: true, createdAt: true, updatedAt: true,
      _count: { select: { clicks: true } },
    },
  })

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(link)
}

/**
 * PATCH /api/admin/links/[id]
 * Update a link.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const existing = await db.link.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: any = {}
  if (typeof body.url === 'string') {
    try { update.url = new URL(body.url).toString() } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
  }
  if (typeof body.title === 'string') update.title = body.title.slice(0, 256) || null
  if (typeof body.description === 'string') update.description = body.description.slice(0, 2048) || null
  if (typeof body.comment === 'string') update.comment = body.comment.slice(0, 2048) || null
  if (typeof body.isActive === 'boolean') update.isActive = body.isActive
  if (typeof body.ipLoggingDisabled === 'boolean') update.ipLoggingDisabled = body.ipLoggingDisabled
  if (body.expiresAt !== undefined) {
    update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  }

  const updated = await db.link.update({ where: { id }, data: update })
  return NextResponse.json(updated)
}

/**
 * DELETE /api/admin/links/[id]?hard=true
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const hard = searchParams.get('hard') === 'true'

  const existing = await db.link.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (hard) {
    await db.link.delete({ where: { id } })
  } else {
    await db.link.update({ where: { id }, data: { isActive: false } })
  }

  return NextResponse.json({ deleted: true, hard })
}
