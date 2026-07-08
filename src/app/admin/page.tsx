'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader, Card, StatCard } from '@/components/admin/AdminShell'
import { Progress } from '@/components/ui/progress'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ExternalLink, Copy, Check } from 'lucide-react'

interface OverviewData {
  totals: {
    links: number
    activeLinks: number
    clicks: number
    clicksThisMonth: number
    clicksToday: number
    clicksLast7Days: number
  }
  timeseries: { last30Days: Record<string, number> }
  topLinks: Array<{ id: string; slug: string; url: string; title: string | null; clicks: number; createdAt: string }>
  breakdowns: {
    countries: { label: string; count: number }[]
    browsers: { label: string; count: number }[]
    os: { label: string; count: number }[]
    devices: { label: string; count: number }[]
    referers: { label: string; count: number }[]
  }
}

interface UsageData {
  app: {
    totalLinks: number
    totalClicks: number
    clicksThisMonth: number
    apiKeysCount: number
    adminCount: number
    estimatedDbBytes: number
  }
  thresholds: {
    vercel: Record<string, { limit: number; label: string; unit: string }>
    neon: Record<string, { limit: number; label: string; unit: string }>
  }
  estimated: {
    neonStoragePercent: number
    vercelFunctionInvocationsPercent: number
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats/overview').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/admin/usage').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([o, u]) => {
      setOverview(o)
      setUsage(u)
      setLoading(false)
    })
  }, [])

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const chartData = overview?.timeseries.last30Days
    ? Object.entries(overview.timeseries.last30Days)
        .map(([date, count]) => ({ date: date.slice(5), clicks: count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : []

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Your URL shortener at a glance — usage, limits, and recent activity."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Links"
          value={usage?.app.totalLinks ?? overview?.totals.links ?? 0}
          sub={`${overview?.totals.activeLinks ?? 0} active`}
        />
        <StatCard
          label="Total Clicks"
          value={usage?.app.totalClicks ?? overview?.totals.clicks ?? 0}
          sub={`${overview?.totals.clicksLast7Days ?? 0} in last 7 days`}
        />
        <StatCard
          label="Clicks Today"
          value={overview?.totals.clicksToday ?? 0}
          sub={`${overview?.totals.clicksThisMonth ?? 0} this month`}
          accent="green"
        />
        <StatCard
          label="API Keys"
          value={usage?.app.apiKeysCount ?? 0}
          sub="active keys"
        />
      </div>

      {/* Free tier usage thresholds */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Free Tier Usage</h2>
          <span className="text-xs text-muted-foreground">Estimated · Hobby plan</span>
        </div>
        <div className="space-y-4">
          <UsageBar
            label="Vercel Function Invocations"
            used={usage?.app.clicksThisMonth ?? 0}
            limit={usage?.thresholds.vercel.serverlessFunctionInvocations.limit ?? 1_000_000}
            unitLabel={usage?.thresholds.vercel.serverlessFunctionInvocations.label ?? '1M/month'}
            formatNum
          />
          <UsageBar
            label="Neon Postgres Storage"
            used={usage?.app.estimatedDbBytes ?? 0}
            limit={usage?.thresholds.neon.storage.limit ?? 512 * 1024 * 1024}
            unitLabel={usage?.thresholds.neon.storage.label ?? '512 MB'}
            formatBytes
          />
          <UsageBar
            label="Vercel Bandwidth"
            used={0}
            limit={usage?.thresholds.vercel.bandwidth.limit ?? 100 * 1024 * 1024 * 1024}
            unitLabel={usage?.thresholds.vercel.bandwidth.label ?? '100 GB/month'}
            formatBytes
            note="Connect Vercel API for live data"
          />
          <UsageBar
            label="Edge Config Writes"
            used={0}
            limit={usage?.thresholds.vercel.edgeConfigWrites.limit ?? 100}
            unitLabel={usage?.thresholds.vercel.edgeConfigWrites.label ?? '100/month'}
            formatNum
            note="Not used yet — reserved for redirect cache"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          To pull live usage from Vercel and Neon, set <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">VERCEL_TOKEN</code> and <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">NEON_API_KEY</code> env vars.
        </p>
      </Card>

      {/* 30-day chart */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-4">Clicks — Last 30 Days</h2>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No clicks yet. Create a link and share it!
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 11 }} stroke="#71717a" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#18181b"
                  strokeWidth={2}
                  fill="url(#clicksGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Top links */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Top Links</h2>
          <Link href="/admin/links" className="text-xs text-muted-foreground hover:underline">View all →</Link>
        </div>
        {!overview?.topLinks.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No links yet.</p>
        ) : (
          <div className="divide-y">
            {overview.topLinks.map(link => (
              <div key={link.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-medium">/{link.slug}</code>
                    <button
                      onClick={() => copyText(`${window.location.origin}/${link.slug}`, `link-${link.id}`)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copied === `link-${link.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{link.title || link.url}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{link.clicks}</div>
                  <div className="text-xs text-muted-foreground">clicks</div>
                </div>
                <a
                  href={`/${link.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownCard title="Top Countries" data={overview?.breakdowns.countries ?? []} />
        <BreakdownCard title="Top Browsers" data={overview?.breakdowns.browsers ?? []} />
        <BreakdownCard title="Top Operating Systems" data={overview?.breakdowns.os ?? []} />
        <BreakdownCard title="Top Referers" data={overview?.breakdowns.referers ?? []} />
      </div>
    </>
  )
}

function UsageBar({
  label, used, limit, unitLabel, formatBytes: isBytes, formatNum, note,
}: {
  label: string
  used: number
  limit: number
  unitLabel: string
  formatBytes?: boolean
  formatNum?: boolean
  note?: string
}) {
  const percent = Math.min((used / limit) * 100, 100)
  const accent = percent > 90 ? 'red' : percent > 70 ? 'amber' : 'green'

  const formatUsed = () => {
    if (isBytes) return formatBytes(used)
    if (formatNum) return used.toLocaleString()
    return used.toString()
  }
  const formatLimit = () => {
    if (isBytes) return formatBytes(limit)
    if (formatNum) return limit.toLocaleString()
    return limit.toString()
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatUsed()} / {formatLimit()} ({unitLabel})
        </span>
      </div>
      <Progress
        value={percent}
        className={`h-2 ${accent === 'red' ? '[&>div]:bg-red-500' : accent === 'amber' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
      />
      {note && <div className="text-xs text-muted-foreground mt-1">{note}</div>}
    </div>
  )
}

function BreakdownCard({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = data[0]?.count || 1
  return (
    <Card>
      <h2 className="font-semibold mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <div className="w-24 truncate" title={item.label}>{item.label}</div>
              <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <div className="w-10 text-right text-muted-foreground text-xs">{item.count}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
