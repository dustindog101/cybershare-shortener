import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth-session'
import { getRequestContext } from '@/lib/request-context'
import { getSettingBool, setSettingBool, SETTING_KEYS } from '@/lib/settings'
import { waitUntil } from '@vercel/functions'

/**
 * Log a login attempt fire-and-forget.
 * Admin login IP/UA is stored RAW (not hashed) for security audit.
 */
function logLoginAttempt(data: {
  email: string
  success: boolean
  adminId?: string
  error?: string
  ctx: ReturnType<typeof getRequestContext>
}) {
  waitUntil(
    db.loginAttempt.create({
      data: {
        email: data.email,
        success: data.success,
        adminId: data.adminId || null,
        error: data.error || null,
        ip: data.ctx.ip,
        userAgent: data.ctx.userAgent.slice(0, 500),
        country: data.ctx.country || null,
        city: data.ctx.city || null,
        region: data.ctx.region || null,
        browser: data.ctx.browser,
        os: data.ctx.os,
        device: data.ctx.device,
      },
    }).catch(() => {})
  )
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets session cookie and returns admin user info.
 * Always logs the attempt (success or failure) with IP, UA, geo.
 */
export async function POST(request: NextRequest) {
  const ctx = getRequestContext(request)

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password } = body
  const emailLower = email ? String(email).toLowerCase() : ''

  if (!email || !password) {
    // Log the failed attempt (missing fields)
    if (emailLower) {
      logLoginAttempt({
        email: emailLower,
        success: false,
        error: 'Missing email or password',
        ctx,
      })
    }
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const admin = await db.adminUser.findUnique({ where: { email: emailLower } })

  if (!admin) {
    logLoginAttempt({
      email: emailLower,
      success: false,
      error: 'No such user',
      ctx,
    })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, admin.password)
  if (!valid) {
    logLoginAttempt({
      email: emailLower,
      success: false,
      error: 'Wrong password',
      ctx,
    })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Success
  const token = await createSessionToken(admin.id)

  logLoginAttempt({
    email: emailLower,
    success: true,
    adminId: admin.id,
    ctx,
  })

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
 * DELETE /api/auth/login
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
