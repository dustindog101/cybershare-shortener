import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifySessionToken, SESSION_COOKIE_NAME, createSessionToken } from '@/lib/auth-session'
import { AdminShell } from '@/components/admin/AdminShell'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  let adminEmail: string | undefined

  // ─────────────────────────────────────────────────────────────
  // ⚠️ TEMPORARY AUTO-LOGIN (for dashboard review)
  // This bypasses auth and auto-logs in as the first admin user.
  // REMOVE THIS BLOCK BEFORE DEPLOYING TO PRODUCTION.
  // ─────────────────────────────────────────────────────────────
  const AUTO_LOGIN_BYPASS = true
  if (AUTO_LOGIN_BYPASS) {
    let admin = await db.adminUser.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => null)

    // If no admin exists, create one with known credentials
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
    adminEmail = admin.email
    return <AdminShell adminEmail={adminEmail}>{children}</AdminShell>
  }
  // ─────────────────────────────────────────────────────────────

  if (token) {
    const payload = await verifySessionToken(token)
    if (payload?.sub) {
      const admin = await db.adminUser.findUnique({
        where: { id: payload.sub },
        select: { email: true },
      }).catch(() => null)
      if (admin) {
        adminEmail = admin.email
      } else {
        redirect('/login')
      }
    } else {
      redirect('/login')
    }
  } else {
    redirect('/login')
  }

  return <AdminShell adminEmail={adminEmail}>{children}</AdminShell>
}
