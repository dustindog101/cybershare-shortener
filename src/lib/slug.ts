import { customAlphabet } from 'nanoid'

// Sink-inspired alphabet: avoids ambiguous chars (0, 1, o, l, i, O, L, I)
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

// Default 6-char slugs (collision-resistant up to ~100K links)
export const generateSlug = (length = 6): string => customAlphabet(ALPHABET, length)()

// Slug regex: alphanumeric with optional hyphens, no leading/trailing hyphens
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

// Reserved slugs that can't be used as short links
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'dashboard',
  'settings',
  'links',
  'analytics',
  'api-keys',
  'stats',
  'metrics',
  'health',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  '_next',
  'static',
])

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 64) return false
  if (isReservedSlug(slug)) return false
  return SLUG_REGEX.test(slug)
}
