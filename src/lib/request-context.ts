import { NextRequest } from 'next/server'

/**
 * Parse User-Agent into browser, os, device (very lightweight, no dep).
 */
export function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' }
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

export function getRequestIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    '0.0.0.0'
  )
}

export function getRequestGeo(request: NextRequest): { country?: string; city?: string; region?: string } {
  return {
    country: request.headers.get('x-vercel-ip-country') || undefined,
    city: request.headers.get('x-vercel-ip-city') || undefined,
    region: request.headers.get('x-vercel-ip-country-region') || undefined,
  }
}

export function getRequestContext(request: NextRequest) {
  const ua = request.headers.get('user-agent') || ''
  const ip = getRequestIp(request)
  const geo = getRequestGeo(request)
  const parsed = parseUserAgent(ua)
  return {
    ip,
    userAgent: ua,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
  }
}
