'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, Loader2, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ shortUrl: string; slug: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function shorten(e: React.FormEvent) {
    e.preventDefault()
    if (!url) return
    if (!apiKey) {
      setError('API key required. Get one from the admin dashboard → API Keys.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const body: any = { url }
      if (slug) body.slug = slug
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to shorten URL')
        return
      }
      setResult({ shortUrl: data.shortUrl, slug: data.slug })
      setUrl('')
      setSlug('')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  function copyShort() {
    if (!result) return
    navigator.clipboard.writeText(result.shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-2xl mb-4">
            ⇄
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            CyberShare
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Fast, simple URL shortener. Self-hosted on Vercel free tier.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={shorten} className="w-full max-w-lg space-y-3">
          <div className="relative">
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste your long URL here..."
              className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="custom-slug (optional)"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
              maxLength={64}
            />
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground px-1">
              API key (required for creating links)
            </summary>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="csk_..."
              className="w-full mt-2 px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
            />
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              Get your API key from the <a href="/admin/api-keys" className="underline">admin dashboard</a>.
            </p>
          </details>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Shortening…</>
            ) : (
              <>Shorten URL <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="w-full max-w-lg mt-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border-2 border-emerald-500/50 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono truncate">{result.shortUrl}</code>
              <button
                onClick={copyShort}
                className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              ✓ Created! Share this link anywhere.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 flex items-center gap-4 text-xs text-muted-foreground">
          <a href="/admin" className="hover:text-foreground">Admin Dashboard</a>
          <span>·</span>
          <a href="/api/health" className="hover:text-foreground">API Status</a>
          <span>·</span>
          <span>Powered by Next.js on Vercel</span>
        </div>
      </div>
    </div>
  )
}
