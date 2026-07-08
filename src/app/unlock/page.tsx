'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function UnlockPage() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('s') || ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Note: full password unlock implementation would verify against the link's
    // PBKDF2 hash via an API endpoint, then set a short-lived cookie before redirecting.
    // For now we surface a clear message — easy to extend.
    setError('Password-protected links require server-side verification. This feature is queued — for now, remove the password via the admin dashboard to access this link.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Password Required</h1>
          <p className="text-sm text-muted-foreground">
            Link <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">/{slug}</code> is protected.
          </p>
        </div>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
        {error && <div className="text-sm text-amber-600 dark:text-amber-400 text-center">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
