import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health
 * Basic health check — used for Vercel deployment verification.
 */
export async function GET() {
  try {
    // Simple DB ping
    await db.link.count()
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'connected',
    })
  } catch (e) {
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'error',
      error: e instanceof Error ? e.message : 'Unknown error',
    }, { status: 503 })
  }
}
