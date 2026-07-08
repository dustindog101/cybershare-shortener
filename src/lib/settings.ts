import { db } from '@/lib/db'

/**
 * App settings helpers.
 * Stored as key-value strings in the Setting table.
 */
export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } })
  return row?.value ?? defaultValue
}

export async function getSettingBool(key: string, defaultValue = false): Promise<boolean> {
  const v = await getSetting(key, defaultValue ? 'true' : 'false')
  return v === 'true' || v === '1'
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

export async function setSettingBool(key: string, value: boolean): Promise<void> {
  await setSetting(key, value ? 'true' : 'false')
}

/**
 * Setting keys used by the app.
 */
export const SETTING_KEYS = {
  /** Global toggle: if false, IP/UA is never logged for any click (overrides per-link). */
  globalIpLogging: 'globalIpLogging',
  /** Whether to log admin login attempts (default: true). */
  logAdminLogins: 'logAdminLogins',
} as const
