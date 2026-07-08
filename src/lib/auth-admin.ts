import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-session'

export interface AdminContext {
  adminId: string
  email: string
}

/**
 * Get admin user from session cookie.
 * Returns null if not authenticated.
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminContext | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifySessionToken(token)
  if (!payload?.sub) return null

  const admin = await db.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  })
  if (!admin) return null

  return { adminId: admin.id, email: admin.email }
}

/**
 * Require admin session on a request.
 * Returns the admin context or a 401 response.
 */
export async function requireAdmin(request: NextRequest): Promise<{ ok: true; admin: AdminContext } | { ok: false; response: NextResponse }> {
  const admin = await getAdminFromRequest(request)
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, admin }
}
