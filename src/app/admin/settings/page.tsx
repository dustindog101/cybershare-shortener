'use client'

import { PageHeader, Card } from '@/components/admin/AdminShell'

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="App configuration and deployment info."
      />

      <Card className="mb-4">
        <h2 className="font-semibold mb-3">Environment Variables</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure these in your Vercel project settings or <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">.env.local</code>:
        </p>
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

      <Card className="mb-4">
        <h2 className="font-semibold mb-3">Admin Dashboard Access</h2>
        <p className="text-sm text-muted-foreground">
          The admin dashboard is at <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">/admin</code>.
          For a dedicated subdomain like <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">admin.cybershare.tech</code>,
          add it as another custom domain in Vercel pointing to the same project — Next.js routing will serve <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">/admin</code> on it automatically.
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Switching to Postgres (Production)</h2>
        <p className="text-sm text-muted-foreground mb-3">
          For Vercel deployment, switch from SQLite to Neon Postgres:
        </p>
        <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
          <li>Create a free Neon project at <a href="https://neon.tech" className="underline" target="_blank" rel="noopener noreferrer">neon.tech</a></li>
          <li>Copy the connection string</li>
          <li>In <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">prisma/schema.prisma</code>, change <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">provider = "sqlite"</code> to <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">provider = "postgresql"</code></li>
          <li>Set <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">DATABASE_URL</code> env var to the Neon connection string</li>
          <li>Run <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">bun run db:push</code> locally or in the Vercel build</li>
          <li>Redeploy</li>
        </ol>
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
