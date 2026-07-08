import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { waitUntil } from '@vercel/functions'
import { hash } from 'crypto'
import { getRequestContext } from '@/lib/request-context'
import { getSettingBool, SETTING_KEYS } from '@/lib/settings'

/**
 * The catch-all redirect handler.
 * Matches /<slug> and redirects to the target URL.
 * Logs click event fire-and-forget via waitUntil (doesn't block redirect).
 *
 * IP/UA logging behavior:
 *   - If link.ipLoggingDisabled === true → IP and UA are null
 *   - If global setting "globalIpLogging" === false → IP and UA are null
 *   - Otherwise IP is hashed (sha256, truncated) for privacy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || slug.length > 64) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const link = await db.link.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true,
      url: true,
      title: true,
      password: true,
      expiresAt: true,
      isActive: true,
      ipLoggingDisabled: true,
    },
  })

  if (!link || !link.isActive) {
    return new NextResponse('Not found', { status: 404 })
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return new NextResponse('This link has expired', { status: 410 })
  }

  if (link.password) {
    const url = new URL('/unlock', request.url)
    url.searchParams.set('s', slug)
    return NextResponse.redirect(url)
  }

  // Resolve IP logging flags
  const globalIpLogging = await getSettingBool(SETTING_KEYS.globalIpLogging, true)
  const shouldLogIp = globalIpLogging && !link.ipLoggingDisabled

  // Get request context
  const ctx = getRequestContext(request)

  // Build click record (IP/UA null if logging disabled)
  const clickData = {
    linkId: link.id,
    ip: shouldLogIp ? hash('sha256', ctx.ip + (process.env.NEXTAUTH_SECRET || 'salt')).slice(0, 16) : null,
    userAgent: shouldLogIp ? ctx.userAgent.slice(0, 500) : null,
    referer: ctx.userAgent ? (request.headers.get('referer')?.slice(0, 500) || null) : null,
    country: ctx.country || null,
    city: ctx.city || null,
    region: ctx.region || null,
    browser: shouldLogIp ? ctx.browser : null,
    os: shouldLogIp ? ctx.os : null,
    device: shouldLogIp ? ctx.device : null,
  }

  // Fire-and-forget: don't block the redirect
  waitUntil(
    db.click.create({ data: clickData }).catch(() => {})
  )

  return NextResponse.redirect(link.url, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
