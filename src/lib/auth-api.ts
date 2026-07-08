import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashApiKey } from '@/lib/api-key'

export interface AuthResult {
  ok: boolean
  error?: string
  status?: number
  apiKey?: {
    id: string
    name: string
    adminUserId: string
  }
}

/**
 * Verify the API key on a request.
 * Updates lastUsedAt fire-and-forget.
 * Returns ok=true with apiKey info if valid.
 */
export async function verifyApiKeyRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')

  let rawKey: string | null = null
  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7).trim()
  } else if (xApiKey) {
    rawKey = xApiKey.trim()
  }

  if (!rawKey || !rawKey.startsWith('csk_')) {
    return { ok: false, error: 'Missing or invalid API key. Use Authorization: Bearer csk_xxx', status: 401 }
  }

  const hashedKey = hashApiKey(rawKey)
  const apiKey = await db.apiKey.findUnique({
    where: { hashedKey },
    select: { id: true, name: true, adminUserId: true, revokedAt: true, expiresAt: true },
  })

  if (!apiKey || apiKey.revokedAt) {
    return { ok: false, error: 'Invalid or revoked API key', status: 401 }
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { ok: false, error: 'API key expired', status: 401 }
  }

  // fire-and-forget: update lastUsedAt
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    ok: true,
    apiKey: { id: apiKey.id, name: apiKey.name, adminUserId: apiKey.adminUserId },
  }
}

/**
 * Reject request with 401 JSON response.
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}
