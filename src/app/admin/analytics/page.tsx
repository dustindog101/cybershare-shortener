'use client'

import { useEffect, useState } from 'react'
import { PageHeader, Card } from '@/components/admin/AdminShell'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface StatsData {
  totals: {
    links: number
    activeLinks: number
    clicks: number
    clicksThisMonth: number
    clicksToday: number
    clicksLast7Days: number
  }
  timeseries: { last30Days: Record<string, number> }
  topLinks: Array<{ id: string; slug: string; url: string; title: string | null; clicks: number; createdAt: string }>
  breakdowns: {
    countries: { label: string; count: number }[]
    browsers: { label: string; count: number }[]
    os: { label: string; count: number }[]
    devices: { label: string; count: number }[]
    referers: { label: string; count: number }[]
  }
}

const PIE_COLORS = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5']

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats/overview')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }

  if (!data) {
    return <Card><p className="text-sm text-muted-foreground text-center py-8">Failed to load analytics.</p></Card>
  }

  const chartData = Object.entries(data.timeseries.last30Days)
    .map(([date, count]) => ({ date: date.slice(5), clicks: count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const deviceData = data.breakdowns.devices.map(d => ({ name: d.label, value: d.count }))
  const browserData = data.breakdowns.browsers.map(d => ({ name: d.label, value: d.count }))

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Click patterns and visitor breakdowns for the last 30 days."
      />

      {/* Time series */}
      <Card className="mb-6">
        <h2 className="font-semibold mb-4">Clicks Over Time</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No clicks in the last 30 days.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="clicksGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#18181b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 11 }} stroke="#71717a" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 12 }} />
                <Area type="monotone" dataKey="clicks" stroke="#18181b" strokeWidth={2} fill="url(#clicksGrad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Devices pie */}
        <Card>
          <h2 className="font-semibold mb-4">Devices</h2>
          {deviceData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Browsers bar */}
        <Card>
          <h2 className="font-semibold mb-4">Browsers</h2>
          {browserData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={browserData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#71717a" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#71717a" width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 12 }} />
                  <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownList title="Top Countries" data={data.breakdowns.countries} />
        <BreakdownList title="Top Operating Systems" data={data.breakdowns.os} />
        <BreakdownList title="Top Referers" data={data.breakdowns.referers} />
        <BreakdownList title="Top Links" data={data.topLinks.map(l => ({ label: `/${l.slug}`, count: l.clicks }))} />
      </div>
    </>
  )
}

function BreakdownList({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const max = data[0]?.count || 1
  return (
    <Card>
      <h2 className="font-semibold mb-3">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data</p>
      ) : (
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <div className="w-32 truncate" title={item.label}>{item.label}</div>
              <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <div className="w-10 text-right text-muted-foreground text-xs">{item.count}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
