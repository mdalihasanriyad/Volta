import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Package, ShoppingBag, TrendingUp, Users, XCircle } from 'lucide-react'
import { Badge, PageHeader, StatCard, money } from '../components/Ui'
import { BarChart, LineChart } from '../components/Charts'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api } from '../../services/api'
import { isSuper } from '../permissions'
import { useAdminAuth } from '../store'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly']
const ORDER = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned']

export default function Dashboard() {
  const admin = useAdminAuth((s) => s.admin)
  const superAdmin = isSuper(admin)
  const [period, setPeriod] = useState('daily')
  const { data: d, loading, error, reload } = useFetch(() => api.get('/admin/dashboard').then((r) => r.data), [])
  const { data: sales } = useFetch(() => (superAdmin ? api.get('/admin/sales', { params: { period } }).then((r) => r.data) : Promise.resolve(null)), [period, superAdmin])

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <PageLoader />
  const counts = d.statusBreakdown || {}
  return (
    <>
      <PageHeader title="Dashboard" subtitle={superAdmin ? 'Store performance at a glance.' : 'Your assigned work at a glance.'} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {superAdmin && <StatCard label="Total revenue" value={money(d.revenue)} icon={TrendingUp} tone="dark" />}
        {superAdmin && <StatCard label="Units sold" value={(d.unitsSold || 0).toLocaleString()} icon={ShoppingBag} />}
        <StatCard label="Total orders" value={d.orders} icon={ClipboardList} />
        <StatCard label="Total products" value={d.products} icon={Package} />
        <StatCard label="Total customers" value={d.customers} icon={Users} />
        <StatCard label="Pending orders" value={d.pending} icon={Clock} tone="amber" />
        <StatCard label="Delivered orders" value={d.delivered} icon={CheckCircle2} tone="green" />
        <StatCard label="Cancelled orders" value={d.cancelled} icon={XCircle} tone="red" />
        <StatCard label="Low-stock SKUs" value={d.lowStock.length} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {superAdmin && (
          <section className="card p-5 xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold">Sales and revenue trend</h2>
              <div role="tablist" className="flex gap-1">{PERIODS.map((p) => <button key={p} role="tab" aria-selected={p === period} type="button" onClick={() => setPeriod(p)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${p === period ? 'bg-ink text-white' : 'bg-gray-100'}`}>{p}</button>)}</div>
            </div>
            {sales?.series.length ? <LineChart labels={sales.series.map((x) => x.label)} values={sales.series.map((x) => x.revenue)} /> : <p className="py-10 text-center text-sm text-gray-500">No sales in this period yet.</p>}
            <p className="mt-1 text-xs text-gray-500">Amounts in BDT. Cancelled and returned orders are excluded.</p>
          </section>
        )}
        <section className={`card p-5 ${superAdmin ? '' : 'xl:col-span-3'}`}>
          <h2 className="mb-3 font-extrabold">Orders by status</h2>
          <BarChart labels={ORDER.map((s) => s.split(' ')[0])} values={ORDER.map((s) => counts[s] || 0)} />
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-brand-deep">View all</Link></div>
          {d.recentOrders.length === 0 ? <p className="py-6 text-sm text-gray-500">No orders yet.</p> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {d.recentOrders.map((o) => <li key={o._id} className="flex items-center justify-between gap-3 py-2.5"><span><span className="font-bold">{o.number}</span> <span className="text-gray-500">{o.customer?.name}</span></span><span className="flex items-center gap-3"><Badge>{o.status}</Badge><span className="w-24 text-right font-bold">{money(o.total)}</span></span></li>)}
            </ul>
          )}
        </section>
        <div className="space-y-6">
          {superAdmin && (
            <section className="card p-5">
              <h2 className="mb-3 font-extrabold">Best-selling products</h2>
              <ol className="space-y-2 text-sm">{(d.bestSellers || []).map((p) => <li key={p._id} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="shrink-0 font-bold">{p.soldCount}</span></li>)}</ol>
            </section>
          )}
          <section className="card p-5">
            <h2 className="mb-3 font-extrabold">Low stock</h2>
            {d.lowStock.length === 0 ? <p className="text-sm text-gray-500">Everything is well stocked.</p> : <ul className="space-y-2 text-sm">{d.lowStock.map((s) => <li key={s._id} className="flex justify-between gap-2"><span className="truncate">{s.sku}</span><span className={`shrink-0 font-bold ${s.quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>{s.quantity}</span></li>)}</ul>}
          </section>
        </div>
      </div>
    </>
  )
}
