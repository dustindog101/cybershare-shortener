'use client'

import { useEffect, useState } from 'react'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, KeyRound, Copy, Check, Trash2, AlertCircle } from 'lucide-react'

interface ApiKeyItem {
  id: string
  name: string
  partialKey: string
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
  _count: { links: number }
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/api-keys')
    const data = await res.json()
    setKeys(data.apiKeys || [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const res = await fetch('/api/admin/api-keys')
      const data = await res.json()
      if (!cancelled) {
        setKeys(data.apiKeys || [])
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  async function revoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone. Links created with it will remain but the key will stop working.')) return
    await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
    setKeys(prev => prev.filter(k => k.id !== id))
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Generate API keys to create links programmatically."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Key
          </Button>
        }
      />

      {/* New key reveal */}
      {newKey && (
        <Card className="mb-6 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                API Key Created: {newKey.name}
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-1 mb-3">
                Copy this key now — you won't be able to see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 rounded text-sm font-mono break-all">
                  {newKey.key}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyKey(newKey.key)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => { setNewKey(null); load() }}
              >
                I've saved it
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <KeyRound className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No API keys yet.</p>
            <Button onClick={() => setShowCreate(true)} variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Create your first API key
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {keys.map(key => (
              <div key={key.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{key.name}</span>
                    <code className="text-xs text-muted-foreground font-mono">…{key.partialKey}</code>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {key._count.links} links · created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    {key.expiresAt && ` · expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => revoke(key.id)}
                  className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-600"
                  title="Revoke"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Usage example */}
      <Card className="mt-6">
        <h2 className="font-semibold mb-3">Using the API</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Use your API key to create links programmatically:
        </p>
        <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto"><code>{`curl -X POST https://your-domain.com/api/links \\
  -H "Authorization: Bearer csk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/long-url", "slug": "my-link"}'`}</code></pre>
        <p className="text-xs text-muted-foreground mt-3">
          The API also accepts <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">X-API-Key</code> header instead of Bearer auth.
        </p>
      </Card>

      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false)
            setNewKey({ key: result.key, name: result.name })
          }}
        />
      )}
    </>
  )
}

function CreateKeyModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (result: { key: string; name: string }) => void
}) {
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const body: any = { name }
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString()
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create key')
        return
      }
      onCreated({ key: data.key, name: data.name })
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium">Name *</label>
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Production, Personal, Bot"
              className="mt-1"
              maxLength={64}
            />
            <p className="text-xs text-muted-foreground mt-1">A label to identify this key.</p>
          </div>
          <div>
            <label className="text-xs font-medium">Expires at (optional)</label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating…' : 'Create Key'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
