'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { Plus, Search, ExternalLink, Trash2, Copy, Check, Power, Shield, ShieldOff, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

interface LinkItem {
  id: string
  slug: string
  url: string
  title: string | null
  comment: string | null
  isActive: boolean
  ipLoggingDisabled: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  _count: { clicks: number }
}

export default function AdminLinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (!reset && cursor) {
      params.set('cursor', cursor)
    }
    const res = await fetch(`/api/admin/links?${params}`)
    const data = await res.json()
    if (reset || !cursor) {
      setLinks(data.links)
    } else {
      setLinks(prev => [...prev, ...data.links])
    }
    setHasMore(data.hasMore)
    setCursor(data.nextCursor)
    setLoading(false)
  }, [search, cursor])

  useEffect(() => {
    const t = setTimeout(() => {
      setCursor(null)
      load(true)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  async function toggleActive(link: LinkItem) {
    await fetch(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !link.isActive }),
    })
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isActive: !l.isActive } : l))
  }

  async function toggleIpLogging(link: LinkItem) {
    const newValue = !link.ipLoggingDisabled
    await fetch(`/api/admin/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipLoggingDisabled: newValue }),
    })
    setLinks(prev => prev.map(l => l.id === link.id ? { ...l, ipLoggingDisabled: newValue } : l))
  }

  async function deleteLink(link: LinkItem, hard: boolean) {
    if (!confirm(hard ? `Permanently delete /${link.slug}? This cannot be undone.` : `Disable /${link.slug}?`)) return
    await fetch(`/api/admin/links/${link.id}?hard=${hard}`, { method: 'DELETE' })
    if (hard) {
      setLinks(prev => prev.filter(l => l.id !== link.id))
    } else {
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, isActive: false } : l))
    }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <PageHeader
        title="Links"
        description="Manage all your short links."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Link
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by slug, URL, or title..."
          className="pl-9"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {links.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {loading ? 'Loading…' : 'No links yet. Create your first one!'}
            </p>
            <Button onClick={() => setShowCreate(true)} variant="outline">
              <Plus className="w-4 h-4 mr-1" /> New Link
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {links.map(link => (
              <div key={link.id} className="p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/links/${link.id}`}
                      className={`text-sm font-medium hover:underline ${!link.isActive ? 'line-through text-muted-foreground' : ''}`}
                    >
                      /{link.slug}
                    </Link>
                    <button
                      onClick={() => copyText(`${window.location.origin}/${link.slug}`, `link-${link.id}`)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copied === `link-${link.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {!link.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-muted-foreground">
                        disabled
                      </span>
                    )}
                    {link.ipLoggingDisabled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        no-IP
                      </span>
                    )}
                    {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                        expired
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {link.title || link.url}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {link._count.clicks} clicks · created {new Date(link.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/links/${link.id}`}
                    className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
                    title="View details & click logs"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <a
                    href={`/${link.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
                    title="Open"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => toggleIpLogging(link)}
                    className={`p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      link.ipLoggingDisabled
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                    title={link.ipLoggingDisabled ? 'IP logging OFF — click to enable' : 'IP logging ON — click to disable for this link'}
                  >
                    {link.ipLoggingDisabled ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => toggleActive(link)}
                    className={`p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 ${link.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}
                    title={link.isActive ? 'Disable' : 'Enable'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLink(link, false)}
                    className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
                    title="Disable (soft delete)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {hasMore && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => load(false)} disabled={loading}>
            {loading ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}

      {showCreate && (
        <CreateLinkModal
          onClose={() => setShowCreate(false)}
          onCreated={(newLink) => {
            setLinks(prev => [newLink, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </>
  )
}

function CreateLinkModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (link: any) => void
}) {
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body: any = { url }
      if (slug) body.slug = slug
      if (title) body.title = title
      if (comment) body.comment = comment
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString()

      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create link')
        return
      }
      onCreated({ ...data, _count: { clicks: 0 } })
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Create New Link</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium">URL *</label>
            <Input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/very-long-url"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Custom slug (optional)</label>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="my-link (leave empty for auto-generated)"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Title (optional)</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Link title for dashboard"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Comment (optional)</label>
            <Input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Internal note"
              className="mt-1"
            />
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
              {loading ? 'Creating…' : 'Create Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
