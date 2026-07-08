'use client'

import { useEffect, useState } from 'react'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, Trash2, AlertTriangle } from 'lucide-react'

export default function AdminSettingsPage() {
  const [globalIpLogging, setGlobalIpLogging] = useState(true)
  const [logAdminLogins, setLogAdminLogins] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  // Delete logs state
  const [deleteOlderThan, setDeleteOlderThan] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        setGlobalIpLogging(d.globalIpLogging ?? true)
        setLogAdminLogins(d.logAdminLogins ?? true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggleGlobalIp(checked: boolean) {
    setGlobalIpLogging(checked)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalIpLogging: checked }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleLogAdminLogins(checked: boolean) {
    setLogAdminLogins(checked)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logAdminLogins: checked }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function deleteOldLogs() {
    if (!deleteOlderThan) return
    const d = new Date(deleteOlderThan)
    if (isNaN(d.getTime())) {
      setDeleteResult('Invalid date')
      return
    }
    if (!confirm(`Permanently delete ALL click logs older than ${d.toLocaleString()}? This cannot be undone.`)) return
    setDeleting(true)
    setDeleteResult(null)
    try {
      const res = await fetch(`/api/admin/clicks?before=${encodeURIComponent(d.toISOString())}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setDeleteResult(`✓ Deleted ${data.deleted} click log(s).`)
      } else {
        setDeleteResult(`✗ ${data.error || 'Failed'}`)
      }
    } catch {
      setDeleteResult('✗ Network error')
    } finally {
      setDeleting(false)
    }
  }

  async function deleteAllLogs() {
    if (!confirm('PERMANENTLY DELETE ALL CLICK LOGS for every link? This cannot be undone. Link records themselves are not affected.')) return
    if (!confirm('Are you absolutely sure? All click analytics will be lost.')) return
    setDeleting(true)
    setDeleteResult(null)
    try {
      const res = await fetch('/api/admin/clicks?all=true', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setDeleteResult(`✓ Deleted ALL ${data.deleted} click log(s).`)
      } else {
        setDeleteResult(`✗ ${data.error || 'Failed'}`)
      }
    } catch {
      setDeleteResult('✗ Network error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="App configuration, IP logging controls, and log management."
      />

      {saved && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm rounded-md border border-emerald-200 dark:border-emerald-900">
          ✓ Setting saved.
        </div>
      )}

      {/* Privacy / IP Logging */}
      <Card className="mb-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Privacy & IP Logging
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Control how visitor IPs and device info are logged across all short links.
        </p>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 py-3 border-t first:border-t-0">
            <div className="flex-1">
              <div className="text-sm font-medium">Log visitor IPs globally</div>
              <p className="text-xs text-muted-foreground mt-1">
                When OFF, no IP or User-Agent info is recorded for any click — only timestamp and country (from Vercel geo headers) are kept.
                Per-link settings are ignored when this is off.
              </p>
            </div>
            <Switch checked={globalIpLogging} onCheckedChange={toggleGlobalIp} />
          </div>

          <div className="flex items-start justify-between gap-4 py-3 border-t">
            <div className="flex-1">
              <div className="text-sm font-medium">Log admin login attempts</div>
              <p className="text-xs text-muted-foreground mt-1">
                Track every admin login (success or failure) with raw IP, location, and device info for security auditing.
                Disable to stop collecting admin login data.
              </p>
            </div>
            <Switch checked={logAdminLogins} onCheckedChange={toggleLogAdminLogins} />
          </div>
        </div>
      </Card>

      {/* Per-link control hint */}
      <Card className="mb-4">
        <h2 className="font-semibold mb-2">Per-Link IP Logging</h2>
        <p className="text-sm text-muted-foreground">
          You can disable IP logging for individual links from the{' '}
          <a href="/admin/links" className="underline">Links page</a>.
          Click the shield icon next to any link to toggle.
          When per-link IP logging is OFF, that link's clicks will still be counted
          (timestamp + country), but no IP or User-Agent will be stored.
        </p>
      </Card>

      {/* Log management */}
      <Card className="mb-4 border-amber-300 dark:border-amber-900">
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4" /> Click Log Management
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete click log entries. Link records themselves are not affected.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium">Delete click logs older than</label>
            <div className="flex gap-2 mt-1">
              <Input
                type="datetime-local"
                value={deleteOlderThan}
                onChange={e => setDeleteOlderThan(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={deleteOldLogs}
                disabled={deleting || !deleteOlderThan}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Old
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t">
            <label className="text-xs font-medium text-red-600 dark:text-red-400">Danger zone</label>
            <div className="mt-2">
              <Button
                variant="outline"
                onClick={deleteAllLogs}
                disabled={deleting}
                className="border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete ALL Click Logs
              </Button>
            </div>
          </div>

          {deleteResult && (
            <div className="text-sm p-2 rounded bg-zinc-100 dark:bg-zinc-800">
              {deleteResult}
            </div>
          )}
        </div>
      </Card>

      {/* Env vars */}
      <Card className="mb-4">
        <h2 className="font-semibold mb-3">Environment Variables</h2>
        <div className="space-y-2 text-sm">
          <EnvRow name="DATABASE_URL" required desc="Postgres connection string (Neon, Supabase, etc.)" />
          <EnvRow name="NEXTAUTH_SECRET" required desc="Random secret for session signing (use: openssl rand -base64 32)" />
          <EnvRow name="SITE_URL" desc="Your shortener domain (e.g. https://short.cybershare.tech)" />
          <EnvRow name="VERCEL_TOKEN" desc="Optional: pull live Vercel usage metrics in dashboard" />
          <EnvRow name="NEON_API_KEY" desc="Optional: pull live Neon storage metrics in dashboard" />
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="font-semibold mb-3">Custom Domains</h2>
        <p className="text-sm text-muted-foreground mb-3">
          To use <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">short.cybershare.tech</code> or <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">link.cybershare.tech</code>:
        </p>
        <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
          <li>Go to your Vercel project → Settings → Domains</li>
          <li>Add your domain (e.g. <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">short.cybershare.tech</code>)</li>
          <li>Update DNS records at your domain registrar as Vercel instructs</li>
          <li>Set <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">SITE_URL</code> env var to the new domain</li>
          <li>Redeploy</li>
        </ol>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Admin Dashboard Access</h2>
        <p className="text-sm text-muted-foreground">
          The admin dashboard is at <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">/admin</code> on any domain pointing to this Vercel project.
          For a dedicated subdomain like <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">admin.cybershare.tech</code>,
          add it as another custom domain in Vercel — Next.js routing serves <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">/admin</code> automatically.
        </p>
      </Card>
    </>
  )
}

function EnvRow({ name, desc, required }: { name: string; desc: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-t first:border-t-0">
      <code className="text-xs font-mono px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0">{name}</code>
      <div className="flex-1 text-xs text-muted-foreground">
        {desc}
        {required && <span className="ml-1 text-red-600">*</span>}
      </div>
    </div>
  )
}
