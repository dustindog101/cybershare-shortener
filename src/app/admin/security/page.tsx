'use client'

import { useEffect, useState } from 'react'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Shield, Trash2, Check, X, MapPin, Globe, Monitor, Clock, Search } from 'lucide-react'

interface LoginAttempt {
  id: string
  email: string
  success: boolean
  error: string | null
  ip: string | null
  userAgent: string | null
  country: string | null
  city: string | null
  region: string | null
  browser: string | null
  os: string | null
  device: string | null
  adminId: string | null
  createdAt: string
}

export default function AdminSecurityPage() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [filterEmail, setFilterEmail] = useState('')
  const [filterIp, setFilterIp] = useState('')
  const [filterSuccess, setFilterSuccess] = useState<'all' | 'true' | 'false'>('all')
  const [logAdminLogins, setLogAdminLogins] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, uniqueIps: 0 })

  // Load first page whenever filters change
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterEmail) params.set('email', filterEmail)
      if (filterIp) params.set('ip', filterIp)
      if (filterSuccess !== 'all') params.set('success', filterSuccess)

      const res = await fetch(`/api/admin/login-attempts?${params}`)
      const data = await res.json()
      if (cancelled) return
      setAttempts(data.attempts || [])
      setHasMore(data.hasMore || false)
      setCursor(data.nextCursor || null)
      setLoading(false)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [filterEmail, filterIp, filterSuccess])

  // Load more (pagination)
  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('cursor', cursor)
    if (filterEmail) params.set('email', filterEmail)
    if (filterIp) params.set('ip', filterIp)
    if (filterSuccess !== 'all') params.set('success', filterSuccess)
    const res = await fetch(`/api/admin/login-attempts?${params}`)
    const data = await res.json()
    setAttempts(prev => [...prev, ...(data.attempts || [])])
    setHasMore(data.hasMore || false)
    setCursor(data.nextCursor || null)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    // Load settings + stats
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setLogAdminLogins(d.logAdminLogins ?? true)
        setSettingsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setSettingsLoading(false)
      })

    // Compute stats from first page (rough)
    fetch('/api/admin/login-attempts?limit=200')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const all = d.attempts || []
        const ips = new Set(all.map((a: LoginAttempt) => a.ip).filter(Boolean))
        setStats({
          total: all.length,
          successful: all.filter((a: LoginAttempt) => a.success).length,
          failed: all.filter((a: LoginAttempt) => !a.success).length,
          uniqueIps: ips.size,
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function toggleLogAdminLogins(checked: boolean) {
    setLogAdminLogins(checked)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logAdminLogins: checked }),
    })
  }

  async function deleteAttempt(id: string) {
    if (!confirm('Delete this login attempt log?')) return
    await fetch(`/api/admin/login-attempts/${id}`, { method: 'DELETE' })
    setAttempts(prev => prev.filter(a => a.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Security"
        description="Admin login attempts and access logs."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Total Attempts</div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Successful</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.successful}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Failed</div>
          <div className="mt-2 text-2xl font-bold text-red-600">{stats.failed}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Unique IPs</div>
          <div className="mt-2 text-2xl font-bold">{stats.uniqueIps}</div>
        </Card>
      </div>

      {/* Log toggle */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin Login Logging
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track every admin login attempt with IP, location, and device info.
              {logAdminLogins
                ? ' Currently logging all attempts (success and failure).'
                : ' Currently NOT logging — turn on to audit logins.'}
            </p>
          </div>
          <Switch
            checked={logAdminLogins}
            onCheckedChange={toggleLogAdminLogins}
            disabled={settingsLoading}
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterEmail}
            onChange={e => setFilterEmail(e.target.value)}
            placeholder="Filter by email..."
            className="pl-9"
          />
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filterIp}
            onChange={e => setFilterIp(e.target.value)}
            placeholder="Filter by IP..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-zinc-900 rounded-md border p-1">
          {(['all', 'true', 'false'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterSuccess(s)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                filterSuccess === s
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : s === 'true' ? 'Success' : 'Failed'}
            </button>
          ))}
        </div>
      </div>

      {/* Attempts list */}
      <Card className="p-0 overflow-hidden">
        {attempts.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : 'No login attempts yet. Logins will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {attempts.map(a => (
              <div key={a.id} className="p-4 flex items-start gap-3">
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  a.success ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'
                }`}>
                  {a.success
                    ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    : <X className="w-4 h-4 text-red-600 dark:text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{a.email}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      a.success
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                    }`}>
                      {a.success ? 'Success' : 'Failed'}
                    </span>
                    {!a.success && a.error && (
                      <span className="text-xs text-muted-foreground">— {a.error}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {a.ip && (
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3" /> {a.ip}
                      </span>
                    )}
                    {a.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {[a.city, a.region, a.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {a.browser && (
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" /> {a.browser} on {a.os}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {a.userAgent && (
                    <div className="text-xs text-muted-foreground mt-1 truncate font-mono opacity-60">
                      {a.userAgent}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteAttempt(a.id)}
                  className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600"
                  title="Delete log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
