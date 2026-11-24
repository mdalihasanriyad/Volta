import { useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, LineChart } from '../components/Charts'
import DataTable from '../components/DataTable'
import { PageHeader, StatCard, downloadCsv, money } from '../components/Ui'
import { ClipboardList, ShoppingBag, TrendingUp } from 'lucide-react'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api } from '../../services/api'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']

export default function Sales() {
  const [period, setPeriod] = useState('monthly')
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/sales', { params: { period } }).then((r) => r.data), [period])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const s = data.series
  const total = s.reduce((n, x) => n + x.revenue, 0)
  const orders = s.reduce((n, x) => n + x.orders, 0)
  const best = s.length ? s.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : null
  const rows = data.products.map((p) => ({ id: p._id, name: p.name, units: p.units, revenue: p.revenue }))
  return (
    <>
      <PageHeader title="Sales reports" subtitle="Revenue excludes cancelled and returned orders. Amounts are in BDT (Super Admin only).">
        <button type="button" className="btn-outline" onClick={() => downloadCsv('sales-by-product.csv', rows.map(({ id, ...r }) => r))}><Download size={16} /> Export CSV</button>
      </PageHeader>
      <div role="tablist" className="mb-4 flex gap-2">{PERIODS.map((p) => <button key={p} role="tab" aria-selected={p === period} type="button" onClick={() => setPeriod(p)} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${p === period ? 'bg-ink text-white' : 'border border-gray-200 bg-white'}`}>{p}</button>)}</div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue in range" value={money(total)} icon={TrendingUp} tone="dark" />
        <StatCard label="Orders in range" value={orders} icon={ClipboardList} />
        <StatCard label="Best period" value={best ? best.label : '–'} icon={ShoppingBag} />
      </div>
      {loading && <p className="mb-2 text-sm text-gray-500">Loading…</p>}
      {s.length === 0 ? <p className="card p-8 text-center text-sm text-gray-500">No sales in this range yet.</p> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5"><h2 className="mb-3 font-extrabold">Revenue trend</h2><LineChart labels={s.map((x) => x.label)} values={s.map((x) => x.revenue)} /></section>
          <section className="card p-5"><h2 className="mb-3 font-extrabold">Orders per period</h2><BarChart labels={s.map((x) => x.label)} values={s.map((x) => x.orders)} /></section>
        </div>
      )}
      <h2 className="mb-3 mt-8 font-extrabold">Product performance</h2>
      <DataTable rows={rows} columns={[{ key: 'name', label: 'Product' }, { key: 'units', label: 'Units sold' }, { key: 'revenue', label: 'Revenue', render: (r) => <span className="font-bold">{money(r.revenue)}</span> }]} />
    </>
  )
}
