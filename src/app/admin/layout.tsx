import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-session'
import { AdminShell } from '@/components/admin/AdminShell'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  let adminEmail: string | undefined
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
