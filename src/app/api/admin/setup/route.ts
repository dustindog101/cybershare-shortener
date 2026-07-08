import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth-session'

/**
 * POST /api/admin/setup
 * One-time setup: create the first admin user.
 * Only succeeds if no admin user exists yet.
 *
 * Body: { email, password, name? }
 */
export async function POST(request: NextRequest) {
  const existingCount = await db.adminUser.count()
  if (existingCount > 0) {
    return NextResponse.json(
      { error: 'Setup already complete. An admin user exists. Use login instead.' },
      { status: 409 }
    )
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password, name } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const hashed = await hashPassword(password)
  const admin = await db.adminUser.create({
    data: {
      email: String(email).toLowerCase(),
      password: hashed,
      name: name || null,
    },
  })

  const token = await createSessionToken(admin.id)
  const response = NextResponse.json({
    admin: { id: admin.id, email: admin.email, name: admin.name },
    setupComplete: true,
  })
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })
  return response
}

/**
 * GET /api/admin/setup
 * Returns whether setup is needed.
 */
export async function GET() {
  const count = await db.adminUser.count()
  return NextResponse.json({ needsSetup: count === 0 })
}
