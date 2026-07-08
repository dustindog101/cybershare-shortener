import { createHash, randomUUID } from 'crypto'

/**
 * Generate a new API key.
 * Format: csk_<32 hex chars>
 * Returns the raw key (shown ONCE to user) + hashed key (stored) + partial (display).
 */
export function generateApiKey(): {
  key: string
  hashedKey: string
  partialKey: string
} {
  const raw = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 8)
  const key = `csk_${raw}`
  const hashedKey = hashApiKey(key)
  const partialKey = key.slice(-4)
  return { key, hashedKey, partialKey }
}

/** SHA-256 hash of an API key for storage. Never store the raw key. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Extract and verify an API key from request headers.
 * Accepts either:
 *   Authorization: Bearer csk_xxx
 *   X-API-Key: csk_xxx
 */
export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim()
    if (key.startsWith('csk_')) return key
  }
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey?.startsWith('csk_')) return xApiKey.trim()
  return null
}
