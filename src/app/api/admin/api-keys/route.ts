import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-admin'
import { generateApiKey } from '@/lib/api-key'

/**
 * GET /api/admin/api-keys
 * List API keys for the current admin.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const keys = await db.apiKey.findMany({
    where: { adminUserId: auth.admin.adminId, revokedAt: null },
    select: {
      id: true, name: true, partialKey: true,
      lastUsedAt: true, createdAt: true, expiresAt: true,
      _count: { select: { links: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ apiKeys: keys })
}

/**
 * POST /api/admin/api-keys
 * Create a new API key. Returns the raw key ONCE.
 *
 * Body: { name: string, expiresAt?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, expiresAt } = body
  if (!name || typeof name !== 'string' || name.length > 64) {
    return NextResponse.json({ error: 'name is required (max 64 chars)' }, { status: 400 })
  }

  let expiresAtDate: Date | null = null
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt)
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 })
    }
  }

  const { key, hashedKey, partialKey } = generateApiKey()

  const created = await db.apiKey.create({
    data: {
      name,
      hashedKey,
      partialKey,
      expiresAt: expiresAtDate,
      adminUserId: auth.admin.adminId,
    },
    select: { id: true, name: true, partialKey: true, createdAt: true, expiresAt: true },
  })

  // Return the raw key ONLY here — never retrievable again
  return NextResponse.json({
    ...created,
    key, // ⚠️ shown once
  }, { status: 201 })
}
