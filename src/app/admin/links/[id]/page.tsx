'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader, Card, StatCard } from '@/components/admin/AdminShell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft, ExternalLink, Copy, Check, Globe, MapPin, Monitor, Clock,
  Trash2, Shield, ShieldOff, Power, ChevronRight, Search, ScrollText,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface LinkDetail {
  id: string
  slug: string
  url: string
  title: string | null
  description: string | null
  comment: string | null
  isActive: boolean
  ipLoggingDisabled: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  _count: { clicks: number }
}

interface ClickLog {
  id: string
  ip: string | null
  userAgent: string | null
  referer: string | null
  country: string | null
  city: string | null
  region: string | null
  browser: string | null
  os: string | null
  device: string | null
  createdAt: string
}

export default function LinkDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [link, setLink] = useState<LinkDetail | null>(null)
  const [clicks, setClicks] = useState<ClickLog[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [filterIp, setFilterIp] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set())
  const [breakdown, setBreakdown] = useState<{
    countries: { label: string; count: number }[]
    browsers: { label: string; count: number }[]
    os: { label: string; count: number }[]
    devices: { label: string; count: number }[]
  }>({ countries: [], browsers: [], os: [], devices: [] })
  const [timeSeries, setTimeSeries] = useState<{ date: string; count: number }[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      fetch(`/api/admin/links/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/admin/clicks?linkId=${id}&limit=500`).then(r => r.ok ? r.json() : null),
    ]).then(([l, c]) => {
      if (cancelled) return
      setLink(l)
      const allClicks: ClickLog[] = c?.clicks || []
      setClicks(allClicks)
      setHasMore(c?.hasMore || false)
      setCursor(c?.nextCursor || null)
      setLoading(false)

      // Compute breakdowns
      function tally(field: keyof ClickLog) {
        const map = new Map<string, number>()
        for (const click of allClicks) {
          const v = (click[field] as string) || 'Unknown'
          map.set(v, (map.get(v) || 0) + 1)
        }
        return Array.from(map.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }
      setBreakdown({
        countries: tally('country'),
        browsers: tally('browser'),
        os: tally('os'),
        devices: tally('device'),
      })

      // Timeseries (group by day)
      const byDay: Record<string, number> = {}
      for (const click of allClicks) {
        const d = new Date(click.createdAt).toISOString().slice(0, 10)
        byDay[d] = (byDay[d] || 0) + 1
      }
      setTimeSeries(
        Object.entries(byDay)
          .map(([date, count]) => ({ date: date.slice(5), count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      )
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  // Re-filter clicks client-side (without re-fetching) when filters change
  const filteredClicks = clicks.filter(c => {
    if (filterIp && !c.ip?.toLowerCase().includes(filterIp.toLowerCase())) return false
    if (filterCountry && !c.country?.toLowerCase().includes(filterCountry.toLowerCase())) return false
    return true
  })

  async function toggleIpLogging() {
    if (!link) return
    const newValue = !link.ipLoggingDisabled
    await fetch(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipLoggingDisabled: newValue }),
    })
    setLink(prev => prev ? { ...prev, ipLoggingDisabled: newValue } : null)
  }

  async function toggleActive() {
    if (!link) return
    const newValue = !link.isActive
    await fetch(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newValue }),
    })
    setLink(prev => prev ? { ...prev, isActive: newValue } : null)
  }

  async function deleteLink() {
    if (!link) return
    if (!confirm(`Permanently delete /${link.slug} and all its click logs? This cannot be undone.`)) return
    await fetch(`/api/admin/links/${link.id}?hard=true`, { method: 'DELETE' })
    router.push('/admin/links')
  }

  async function deleteClick(clickId: string) {
    if (!confirm('Delete this click log entry?')) return
    await fetch(`/api/admin/clicks/${clickId}`, { method: 'DELETE' })
    setClicks(prev => prev.filter(c => c.id !== clickId))
  }

  async function deleteAllClicks() {
    if (!link) return
    if (!confirm(`Delete ALL ${link._count.clicks} click logs for /${link.slug}? The link itself will remain.`)) return
    await fetch(`/api/admin/clicks?linkId=${link.id}`, { method: 'DELETE' })
    setClicks([])
    setLink(prev => prev ? { ...prev, _count: { clicks: 0 } } : null)
  }

  function copyShort() {
    if (!link) return
    navigator.clipboard.writeText(`${window.location.origin}/${link.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleDetail(id: string) {
    setShowDetails(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }

  if (!link) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground text-center py-8">
          Link not found. <Link href="/admin/links" className="underline">Back to links</Link>
        </p>
      </Card>
    )
  }

  return (
    <>
      {/* Back link + header */}
      <Link href="/admin/links" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> All links
      </Link>

      <PageHeader
        title={`/${link.slug}`}
        description={link.title || link.url}
        action={
          <div className="flex items-center gap-2">
            <a
              href={`/${link.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="w-4 h-4" /> Open
            </a>
            <button
              onClick={copyShort}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              Copy
            </button>
            <button
              onClick={toggleIpLogging}
              className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md ${
                link.ipLoggingDisabled
                  ? 'border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-400'
                  : 'border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
              }`}
              title={link.ipLoggingDisabled ? 'IP logging OFF — click to enable' : 'IP logging ON — click to disable'}
            >
              {link.ipLoggingDisabled ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {link.ipLoggingDisabled ? 'No-IP' : 'IP On'}
            </button>
            <button
              onClick={toggleActive}
              className={`inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-md ${
                link.isActive
                  ? 'border-emerald-300 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                  : 'border-zinc-300 dark:border-zinc-700 text-muted-foreground'
              }`}
            >
              <Power className="w-4 h-4" />
              {link.isActive ? 'Active' : 'Disabled'}
            </button>
            <button
              onClick={deleteLink}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Clicks"
          value={link._count.clicks}
          sub="all time"
        />
        <StatCard
          label="Status"
          value={link.isActive ? 'Active' : 'Disabled'}
          accent={link.isActive ? 'green' : 'red'}
        />
        <StatCard
          label="IP Logging"
          value={link.ipLoggingDisabled ? 'OFF' : 'ON'}
          accent={link.ipLoggingDisabled ? 'amber' : 'green'}
          sub={link.ipLoggingDisabled ? 'No IP/UA stored' : 'Storing IP + UA'}
        />
        <StatCard
          label="Created"
          value={new Date(link.createdAt).toLocaleDateString()}
          sub={link.expiresAt ? `expires ${new Date(link.expiresAt).toLocaleDateString()}` : 'no expiry'}
        />
      </div>

      {/* Target URL */}
      <Card className="mb-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Target URL</div>
        <div className="text-sm font-mono break-all">{link.url}</div>
        {link.comment && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Comment</div>
            <div className="text-sm">{link.comment}</div>
          </div>
        )}
      </Card>

      {/* Click chart */}
      {timeSeries.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-4">Clicks Over Time</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="linkClicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 11 }} stroke="#71717a" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#18181b" strokeWidth={2} fill="url(#linkClicksGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BreakdownCard title="Countries" data={breakdown.countries} />
        <BreakdownCard title="Browsers" data={breakdown.browsers} />
        <BreakdownCard title="Operating Systems" data={breakdown.os} />
        <BreakdownCard title="Devices" data={breakdown.devices} />
      </div>

      {/* Click logs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Click Log ({filteredClicks.length} shown)</h2>
        {clicks.length > 0 && (
          <Button variant="outline" size="sm" onClick={deleteAllClicks}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete All Logs
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterIp}
            onChange={e => setFilterIp(e.target.value)}
            placeholder="Filter by IP..."
            className="pl-9 font-mono text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            placeholder="Country code..."
            className="pl-9"
          />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {filteredClicks.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : 'No click logs for this link yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredClicks.slice(0, 100).map(log => {
              const expanded = showDetails.has(log.id)
              return (
                <div key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div
                    className="p-4 flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleDetail(log.id)}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.ip ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {log.ip ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Globe className="w-3 h-3" /> {log.ip}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic">IP not logged</span>
                        )}
                        {log.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[log.city, log.region, log.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {log.browser && (
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" /> {log.browser}
                            {log.os && ` · ${log.os}`}
                            {log.device && ` · ${log.device}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1 ${expanded ? 'rotate-90' : ''}`} />
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteClick(log.id) }}
                      className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 pt-0 -mt-1 ml-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <DetailRow label="Click ID" value={log.id} mono />
                      <DetailRow label="IP (hashed)" value={log.ip || '—'} mono />
                      <DetailRow label="Country" value={log.country || '—'} />
                      <DetailRow label="Region" value={log.region || '—'} />
                      <DetailRow label="City" value={log.city || '—'} />
                      <DetailRow label="Browser" value={log.browser || '—'} />
                      <DetailRow label="OS" value={log.os || '—'} />
                      <DetailRow label="Device" value={log.device || '—'} />
                      <DetailRow label="Referer" value={log.referer || '—'} />
                      <DetailRow label="Timestamp" value={new Date(log.createdAt).toISOString()} mono />
                      <div className="sm:col-span-2 lg:col-span-3 mt-2 pt-2 border-t">
                        <div className="text-muted-foreground mb-1">User-Agent</div>
                        <code className="block break-all text-[10px] opacity-70">
                          {log.userAgent || '(not logged — IP logging was disabled for this link at click time)'}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {filteredClicks.length > 100 && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Showing first 100 of {filteredClicks.length} logs. Use filters to narrow down.
        </p>
      )}
    </>
  )
}

function BreakdownCard({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = data[0]?.count || 1
  return (
    <Card>
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      {data.length === 0 || (data.length === 1 && data[0].label === 'Unknown') ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data</p>
      ) : (
        <div className="space-y-2">
          {data.filter(d => d.label !== 'Unknown').slice(0, 5).map(item => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <div className="w-20 truncate" title={item.label}>{item.label}</div>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-muted-foreground">{item.count}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-24">{label}</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
