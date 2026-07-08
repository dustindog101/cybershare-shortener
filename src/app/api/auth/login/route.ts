import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth-session'

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets session cookie and returns admin user info.
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const admin = await db.adminUser.findUnique({ where: { email: String(email).toLowerCase() } })
  if (!admin) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, admin.password)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createSessionToken(admin.id)

  const response = NextResponse.json({
    admin: { id: admin.id, email: admin.email, name: admin.name }
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
 * DELETE /api/auth/logout
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
