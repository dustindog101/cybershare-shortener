import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-session'

export interface AdminContext {
  adminId: string
  email: string
}

// ─────────────────────────────────────────────────────────────
// ⚠️ TEMPORARY AUTO-LOGIN BYPASS (for dashboard review)
// When true, all admin API routes authenticate as the first admin user
// without checking the session cookie. REMOVE BEFORE PRODUCTION DEPLOY.
// ─────────────────────────────────────────────────────────────
export const AUTH_BYPASS_ENABLED = true

/**
 * Get admin user from session cookie, OR auto-login as first admin
 * when AUTH_BYPASS_ENABLED is true (temporary dev mode).
 */
export async function getAdminFromRequest(request: NextRequest): Promise<AdminContext | null> {
  // TEMPORARY BYPASS — auto-login as first admin (create if needed)
  if (AUTH_BYPASS_ENABLED) {
    let admin = await db.adminUser.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => null)

    if (!admin) {
      const { hashPassword } = await import('@/lib/auth-session')
      const hashed = await hashPassword('admin123')
      admin = await db.adminUser.create({
        data: {
          email: 'admin@local',
          password: hashed,
          name: 'Auto-created Admin',
        },
        select: { id: true, email: true },
      })
    }
    return { adminId: admin.id, email: admin.email }
  }

  // Normal auth (currently disabled — see AUTH_BYPASS_ENABLED above)
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
 * Require admin session on a request (with bypass support).
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
