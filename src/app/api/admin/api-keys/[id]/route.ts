import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * DELETE /api/admin/api-keys/[id]
 * Revoke an API key (sets revokedAt — never hard delete for audit).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const key = await db.apiKey.findUnique({
    where: { id },
    select: { id: true, adminUserId: true },
  })

  if (!key || key.adminUserId !== auth.admin.adminId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ revoked: true })
}
