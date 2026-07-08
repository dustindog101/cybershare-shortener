import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { waitUntil } from '@vercel/functions'
import { hash } from 'crypto'

/**
 * Parse User-Agent into browser, os, device (very lightweight, no dep).
 */
function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  const browser = /edg/i.test(ua) ? 'Edge'
    : /opr|opera/i.test(ua) ? 'Opera'
    : /chrome|crios/i.test(ua) ? 'Chrome'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /safari/i.test(ua) ? 'Safari'
    : 'Other'
  const os = /windows/i.test(ua) ? 'Windows'
    : /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
    : /mac os/i.test(ua) ? 'macOS'
    : /linux/i.test(ua) ? 'Linux'
    : 'Other'
  const device = /mobile|android|iphone/i.test(ua) ? 'Mobile'
    : /ipad|tablet/i.test(ua) ? 'Tablet'
    : 'Desktop'
  return { browser, os, device }
}

function hashIp(ip: string): string {
  return hash('sha256', ip + (process.env.NEXTAUTH_SECRET || 'salt')).slice(0, 16)
}

function getCountryFromRequest(request: NextRequest): { country?: string; city?: string; region?: string } {
  const country = request.headers.get('x-vercel-ip-country') || undefined
  const city = request.headers.get('x-vercel-ip-city') || undefined
  const region = request.headers.get('x-vercel-ip-country-region') || undefined
  return { country, city, region }
}

/**
 * The catch-all redirect handler.
 * Matches /<slug> and redirects to the target URL.
 * Logs click event fire-and-forget via waitUntil (doesn't block redirect).
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

  // Log click fire-and-forget — doesn't block the redirect
  const ua = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0'
  const referer = request.headers.get('referer') || undefined
  const { country, city, region } = getCountryFromRequest(request)
  const { browser, os, device } = ua ? parseUserAgent(ua) : { browser: 'Other', os: 'Other', device: 'Other' }

  waitUntil(
    db.click.create({
      data: {
        linkId: link.id,
        ip: hashIp(ip),
        userAgent: ua.slice(0, 500),
        referer: referer?.slice(0, 500),
        country,
        city,
        region,
        browser,
        os,
        device,
      },
    }).catch(() => {})
  )

  return NextResponse.redirect(link.url, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
