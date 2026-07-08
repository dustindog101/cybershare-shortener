import { hash, compare } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

// Use Web Crypto via jose for edge compatibility on Vercel
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me'
)

const SESSION_COOKIE = 'cs_admin_session'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed)
}

export async function createSessionToken(adminUserId: string): Promise<string> {
  return new SignJWT({ sub: adminUserId, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(SECRET)
}

export async function verifySessionToken(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { sub: string; role: string }
  } catch {
    return null
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_TTL_SECONDS = SESSION_TTL
