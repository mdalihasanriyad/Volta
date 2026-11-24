import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Boxes, Coins, SlidersHorizontal } from 'lucide-react'
import DataTable from '../components/DataTable'
import { Badge, Modal, PageHeader, StatCard, money } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { isSuper } from '../permissions'
import { useAdminAuth, useAdminToast } from '../store'

export default function Inventory() {
  const admin = useAdminAuth((s) => s.admin)
  const notify = useAdminToast((s) => s.notify)
  const [tab, setTab] = useState('stock')
  const [q, setQ] = useState('')
  const [low, setLow] = useState(false)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(null)
  const stock = useFetch(() => api.get('/admin/inventory', { params: { q: q || undefined, low: low ? '1' : undefined, page, limit: 50 } }).then((r) => r.data), [q, low, page])
  const moves = useFetch(() => (tab === 'moves' ? api.get('/admin/inventory/movements', { params: { page, limit: 50 } }).then((r) => r.data) : Promise.resolve(null)), [tab, page])
  const { register, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { type: 'stock_in', direction: 'add', quantity: 1, reason: '' } })
  const type = watch('type')

  const apply = async (d) => {
    try {
      await api.post('/admin/inventory/adjust', { sku: sel.sku, type: d.type, direction: d.type === 'adjustment' ? d.direction : undefined, quantity: Number(d.quantity), reason: d.reason, ...(d.reorderLevel !== '' && d.reorderLevel != null ? { reorderLevel: Number(d.reorderLevel) } : {}) })
      notify('Stock updated'); setSel(null); stock.reload(); moves.reload()
    } catch (e) { setError('quantity', { message: errMsg(e) }) }
  }

  if (stock.error) return <ErrorBox error={stock.error} onRetry={stock.reload} />
  if (!stock.data) return <PageLoader />
  const d = stock.data
  const rows = d.items.map((i) => ({ ...i, id: i._id }))
  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock per SKU and variant. Stock can never go below zero, and every change is recorded." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="SKUs shown" value={d.total} icon={Boxes} />
        <StatCard label="Low or out of stock (this page)" value={rows.filter((i) => i.quantity <= i.reorderLevel).length} icon={AlertTriangle} tone="amber" />
        {isSuper(admin) && <StatCard label="Inventory valuation (at cost)" value={money(d.valuation)} icon={Coins} tone="dark" />}
      </div>
      <div role="tablist" className="mb-4 flex gap-2">{[['stock', 'Stock overview'], ['moves', 'Stock movements']].map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => { setTab(id); setPage(1) }} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === id ? 'bg-ink text-white' : 'border border-gray-200 bg-white'}`}>{l}</button>)}</div>
      {tab === 'stock' ? (<>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input aria-label="Search SKU" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search SKU" className="input max-w-xs" />
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1) }} /> Low stock only</label>
        </div>
        <DataTable rows={rows} server={{ page: d.page, pages: d.pages, total: d.total, onPage: setPage }} columns={[
          { key: 'sku', label: 'SKU' }, { key: 'product', label: 'Product', render: (i) => i.product?.name },
          { key: 'quantity', label: 'In stock', render: (i) => <span className={`font-bold ${i.quantity === 0 ? 'text-red-600' : i.quantity <= i.reorderLevel ? 'text-amber-600' : ''}`}>{i.quantity}</span> },
          { key: 'reorderLevel', label: 'Alert at' }, ...(isSuper(admin) ? [{ key: 'costPrice', label: 'Cost', render: (i) => money(i.costPrice) }] : []),
          { key: 'state', label: 'Status', render: (i) => <span className={`text-xs font-bold ${i.quantity === 0 ? 'text-red-600' : i.quantity <= i.reorderLevel ? 'text-amber-600' : 'text-emerald-600'}`}>{i.quantity === 0 ? 'Out of stock' : i.quantity <= i.reorderLevel ? 'Low stock' : 'OK'}</span> },
        ]} actions={(i) => <button type="button" className="btn-outline !py-1.5 !text-xs" onClick={() => { reset({ type: 'stock_in', direction: 'add', quantity: 1, reason: '', reorderLevel: i.reorderLevel }); setSel(i) }}><SlidersHorizontal size={14} /> Adjust</button>} />
      </>) : moves.data ? (
        <DataTable rows={moves.data.items.map((m) => ({ ...m, id: m._id }))} server={{ page: moves.data.page, pages: moves.data.pages, total: moves.data.total, onPage: setPage }} columns={[
          { key: 'createdAt', label: 'When', render: (m) => new Date(m.createdAt).toLocaleString() }, { key: 'sku', label: 'SKU' },
          { key: 'type', label: 'Type', render: (m) => <Badge>{{ stock_in: 'Stock in', stock_out: 'Stock out', adjustment: 'Adjustment', sale: 'Stock out', cancel_restore: 'Stock in', initial: 'Stock in' }[m.type]}</Badge> },
          { key: 'quantity', label: 'Qty', render: (m) => <span className="font-bold">{m.quantity > 0 ? '+' : ''}{m.quantity}</span> }, { key: 'balanceAfter', label: 'Balance' },
          { key: 'by', label: 'By', render: (m) => m.adminName || m.reference || 'System' }, { key: 'reason', label: 'Reason' },
        ]} />
      ) : <PageLoader />}
      {sel && (
        <Modal title={`Adjust ${sel.sku}`} onClose={() => setSel(null)}>
          <p className="mb-3 text-sm text-gray-500">{sel.product?.name}. Currently {sel.quantity} in stock.</p>
          <form onSubmit={handleSubmit(apply)} noValidate className="space-y-4">
            <div><label htmlFor="it" className="label">Type</label><select id="it" className="input" {...register('type')}><option value="stock_in">Stock in (received)</option><option value="stock_out">Stock out (removed)</option><option value="adjustment">Adjustment (correction)</option></select></div>
            {type === 'adjustment' && <div><label htmlFor="id" className="label">Direction</label><select id="id" className="input" {...register('direction')}><option value="add">Add to stock</option><option value="remove">Remove from stock</option></select></div>}
            <div><label htmlFor="iq" className="label">Quantity</label><input id="iq" type="number" className="input" {...register('quantity', { required: 'Enter a quantity', min: { value: 1, message: 'Quantity must be at least 1' } })} />{errors.quantity && <p className="field-error">{errors.quantity.message}</p>}</div>
            <div><label htmlFor="ir" className="label">Reason (kept in the audit trail)</label><input id="ir" className="input" {...register('reason', { required: 'Enter a reason', minLength: { value: 3, message: 'Enter a reason' } })} />{errors.reason && <p className="field-error">{errors.reason.message}</p>}</div>
            <div><label htmlFor="ia" className="label">Low-stock alert level</label><input id="ia" type="number" min="0" className="input" {...register('reorderLevel')} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setSel(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={isSubmitting}>Save adjustment</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
