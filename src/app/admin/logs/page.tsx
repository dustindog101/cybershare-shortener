'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ScrollText, Search, Trash2, ExternalLink, Globe, MapPin, Monitor,
  Clock, Filter, ChevronRight,
} from 'lucide-react'

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
  link: { id: string; slug: string; url: string }
}

interface Stats {
  total: number
  withIp: number
  uniqueIps: number
  uniqueCountries: number
  uniqueBrowsers: number
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ClickLog[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [filterIp, setFilterIp] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterLink, setFilterLink] = useState('')
  const [stats, setStats] = useState<Stats>({ total: 0, withIp: 0, uniqueIps: 0, uniqueCountries: 0, uniqueBrowsers: 0 })
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set())

  // Load first page whenever filters change
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterIp) params.set('ip', filterIp)
      if (filterCountry) params.set('country', filterCountry)
      if (filterLink) params.set('linkId', filterLink)

      const res = await fetch(`/api/admin/clicks?${params}`)
      const data = await res.json()
      if (cancelled) return
      setLogs(data.clicks || [])
      setHasMore(data.hasMore || false)
      setCursor(data.nextCursor || null)
      setLoading(false)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [filterIp, filterCountry, filterLink])

  // Load stats on mount + whenever filter changes
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/clicks?limit=500')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const all: ClickLog[] = d.clicks || []
        const ips = new Set(all.map(c => c.ip).filter(Boolean))
        const countries = new Set(all.map(c => c.country).filter(Boolean))
        const browsers = new Set(all.map(c => c.browser).filter(Boolean))
        setStats({
          total: all.length,
          withIp: all.filter(c => c.ip).length,
          uniqueIps: ips.size,
          uniqueCountries: countries.size,
          uniqueBrowsers: browsers.size,
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [filterIp, filterCountry, filterLink])

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('cursor', cursor)
    if (filterIp) params.set('ip', filterIp)
    if (filterCountry) params.set('country', filterCountry)
    if (filterLink) params.set('linkId', filterLink)
    const res = await fetch(`/api/admin/clicks?${params}`)
    const data = await res.json()
    setLogs(prev => [...prev, ...(data.clicks || [])])
    setHasMore(data.hasMore || false)
    setCursor(data.nextCursor || null)
    setLoading(false)
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this click log entry?')) return
    await fetch(`/api/admin/clicks/${id}`, { method: 'DELETE' })
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  function toggleDetail(id: string) {
    setShowDetails(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <PageHeader
        title="Click Logs"
        description="Every click on every short link — IP, location, device, and more."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Total Clicks</div>
          <div className="mt-1 text-xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">With IP Logged</div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{stats.withIp}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Unique IPs</div>
          <div className="mt-1 text-xl font-bold">{stats.uniqueIps}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Countries</div>
          <div className="mt-1 text-xl font-bold">{stats.uniqueCountries}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Browsers</div>
          <div className="mt-1 text-xl font-bold">{stats.uniqueBrowsers}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterIp}
            onChange={e => setFilterIp(e.target.value)}
            placeholder="Filter by IP (hashed)..."
            className="pl-9 font-mono text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
            placeholder="Country code (US, GB...)"
            className="pl-9"
          />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterLink}
            onChange={e => setFilterLink(e.target.value)}
            placeholder="Link ID filter..."
            className="pl-9 font-mono text-xs"
          />
        </div>
        {(filterIp || filterCountry || filterLink) && (
          <Button
            variant="outline"
            onClick={() => { setFilterIp(''); setFilterCountry(''); setFilterLink('') }}
          >
            <Filter className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Logs list */}
      <Card className="p-0 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : 'No click logs match your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map(log => {
              const expanded = showDetails.has(log.id)
              return (
                <div key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <div
                    className="p-4 flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleDetail(log.id)}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${log.ip ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    <div className="flex-1 min-w-0">
                      {/* Top row: link + timestamp */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/links/${log.link.id}`}
                          className="text-sm font-medium hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          /{log.link.slug}
                        </Link>
                        <a
                          href={`/${log.link.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Second row: IP + location + device */}
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

                      {/* Referer if present */}
                      {log.referer && (
                        <div className="text-xs text-muted-foreground mt-1 truncate opacity-70">
                          via {log.referer}
                        </div>
                      )}
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1 ${expanded ? 'rotate-90' : ''}`}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLog(log.id) }}
                      className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600"
                      title="Delete log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-0 -mt-1 ml-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <DetailRow label="Click ID" value={log.id} mono />
                      <DetailRow label="Link ID" value={log.link.id} mono />
                      <DetailRow label="Target URL" value={log.link.url} />
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
                          {log.userAgent || '(not logged — IP logging disabled for this link)'}
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

      {hasMore && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
    </>
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
