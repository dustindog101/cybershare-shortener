'use client'

import { useEffect, useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'login' | 'setup'>('login')

  useEffect(() => {
    // Check if setup is needed
    fetch('/api/admin/setup')
      .then(r => r.json())
      .then(data => {
        setNeedsSetup(data.needsSetup)
        if (data.needsSetup) setMode('setup')
      })
      .catch(() => setNeedsSetup(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = mode === 'setup' ? '/api/admin/setup' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: email.split('@')[0] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      // Redirect to admin dashboard (hard navigation to ensure cookie is sent)
      const params = new URLSearchParams(window.location.search)
      const next = params.get('next') || '/admin'
      window.location.href = next
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xl mb-4">
            CS
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'setup' ? 'Create Admin Account' : 'CyberShare Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'setup'
              ? 'First-time setup — create your admin account'
              : 'Sign in to access the dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-xl border shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={mode === 'setup' ? 8 : 1}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder={mode === 'setup' ? 'At least 8 characters' : '••••••••'}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Please wait…' : mode === 'setup' ? 'Create Account & Sign In' : 'Sign In'}
          </button>

          {needsSetup === false && (
            <p className="text-xs text-center text-muted-foreground pt-2">
              Use your admin credentials to access the dashboard.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
