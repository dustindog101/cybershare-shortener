import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'

/**
 * DELETE /api/admin/clicks/[id]
 * Delete a single click log entry.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  await db.click.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ deleted: true })
}
