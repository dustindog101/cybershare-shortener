import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'
import { getSettingBool, setSettingBool, SETTING_KEYS } from '@/lib/settings'

/**
 * GET /api/admin/settings
 * Returns all admin-configurable settings.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const [globalIpLogging, logAdminLogins] = await Promise.all([
    getSettingBool(SETTING_KEYS.globalIpLogging, true),
    getSettingBool(SETTING_KEYS.logAdminLogins, true),
  ])

  return NextResponse.json({
    globalIpLogging,
    logAdminLogins,
  })
}

/**
 * PATCH /api/admin/settings
 * Update one or more settings.
 *
 * Body: { globalIpLogging?: boolean, logAdminLogins?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Promise<void>[] = []
  if (typeof body.globalIpLogging === 'boolean') {
    updates.push(setSettingBool(SETTING_KEYS.globalIpLogging, body.globalIpLogging))
  }
  if (typeof body.logAdminLogins === 'boolean') {
    updates.push(setSettingBool(SETTING_KEYS.logAdminLogins, body.logAdminLogins))
  }

  await Promise.all(updates)

  const [globalIpLogging, logAdminLogins] = await Promise.all([
    getSettingBool(SETTING_KEYS.globalIpLogging, true),
    getSettingBool(SETTING_KEYS.logAdminLogins, true),
  ])

  return NextResponse.json({ globalIpLogging, logAdminLogins })
}
