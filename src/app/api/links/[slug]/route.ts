import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKeyRequest, unauthorizedResponse } from '@/lib/auth-api'

/**
 * GET /api/links/[slug]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await verifyApiKeyRequest(request)
  if (!auth.ok) return unauthorizedResponse(auth.error)

  const { slug } = await params
  const link = await db.link.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true, slug: true, url: true, title: true, description: true, comment: true,
      isActive: true, expiresAt: true, createdAt: true, updatedAt: true,
      _count: { select: { clicks: true } },
    },
  })

  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  return NextResponse.json(link)
}

/**
 * DELETE /api/links/[slug]?hard=true
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await verifyApiKeyRequest(request)
  if (!auth.ok) return unauthorizedResponse(auth.error)

  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const hard = searchParams.get('hard') === 'true'

  const link = await db.link.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { id: true },
  })

  if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })

  if (hard) {
    await db.link.delete({ where: { id: link.id } })
  } else {
    await db.link.update({ where: { id: link.id }, data: { isActive: false } })
  }

  return NextResponse.json({ deleted: true, hard })
}
