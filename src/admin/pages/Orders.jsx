import { useState } from 'react'
import { Download, Eye, FileText, Printer } from 'lucide-react'
import DataTable from '../components/DataTable'
import { Badge, ConfirmModal, Modal, PageHeader, money } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { formatSnapshot } from '../../utils/format'
import { useAdminToast } from '../store'

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned']

function Invoice({ order, onClose }) {
  return (
    <Modal title={`Invoice ${order.number}`} onClose={onClose} wide>
      <div className="print-area text-sm">
        <div className="flex justify-between"><div><p className="text-lg font-extrabold">Volta</p></div><div className="text-right"><p className="font-bold">{order.number}</p><p className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p></div></div>
        <p className="mt-4 font-bold">Bill to</p><p>{order.shippingAddress.fullName}, {order.shippingAddress.phone}</p><p className="text-gray-500">{order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.country}</p>
        <table className="mt-4 w-full"><thead><tr className="border-b text-left"><th className="py-2">Item</th><th>Qty</th><th className="text-right">Price</th></tr></thead>
          <tbody>{order.items.map((i, k) => <tr key={k} className="border-b border-gray-100"><td className="py-2">{i.name}{i.model ? ` (${i.model})` : ''}<br /><span className="text-xs text-gray-500">{i.sku}</span></td><td>{i.quantity}</td><td className="text-right">{money(i.lineTotal)}</td></tr>)}</tbody></table>
        <dl className="ml-auto mt-4 w-60 space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>-{money(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shippingFee ? money(order.shippingFee) : 'Free'}</dd></div>
          <div className="flex justify-between border-t pt-1 font-extrabold"><dt>Total (BDT)</dt><dd>{money(order.total)}</dd></div>
          {order.currency.code !== 'BDT' && <div className="flex justify-between text-gray-500"><dt>In {order.currency.code}</dt><dd>{formatSnapshot(order.totalDisplay, order.currency)}</dd></div>}
        </dl>
        <p className="mt-4 text-xs text-gray-500">Payment: Cash on Delivery ({order.payment.status}). Rate used at checkout: 1 BDT = {order.currency.rate} {order.currency.code}.</p>
      </div>
      <div className="mt-4 flex justify-end"><button type="button" className="btn-primary" onClick={() => window.print()}><Printer size={16} /> Print invoice</button></div>
    </Modal>
  )
}

export default function Orders() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [cancel, setCancel] = useState(null)
  const notify = useAdminToast((s) => s.notify)
  const params = { q: q || undefined, status: status || undefined }
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/orders', { params: { ...params, page, limit: 20 } }).then((r) => r.data), [q, status, page])

  const run = async (fn, ok) => { try { const { data: o } = await fn(); setSel((s) => (s ? o : s)); notify(ok); reload(); return o } catch (e) { notify(errMsg(e)) } }
  const csvHref = `/api/admin/orders?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), format: 'csv' })}`

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const rows = data.items.map((o) => ({ ...o, id: o._id }))
  const cur = sel
  return (
    <>
      <PageHeader title="Orders" subtitle="Cash on Delivery orders. Update status, add tracking and notes.">
        <a href={csvHref} className="btn-outline"><Download size={16} /> Export CSV</a>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="oq">Search orders</label>
        <input id="oq" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search order, customer, phone or email" className="input max-w-xs" />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input max-w-[200px]"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        {loading && <span className="self-center text-sm text-gray-500">Loading…</span>}
      </div>
      <DataTable rows={rows} server={{ page: data.page, pages: data.pages, total: data.total, onPage: setPage }}
        columns={[
          { key: 'number', label: 'Order', render: (o) => <span className="font-bold">{o.number}</span> }, { key: 'createdAt', label: 'Date', render: (o) => new Date(o.createdAt).toLocaleDateString() },
          { key: 'customer', label: 'Customer', render: (o) => o.customer?.name }, { key: 'total', label: 'Total', render: (o) => money(o.total) },
          { key: 'payment', label: 'Payment', render: (o) => <Badge>{o.payment.status === 'paid' ? 'Paid' : 'Unpaid'}</Badge> }, { key: 'status', label: 'Status', render: (o) => <Badge>{o.status}</Badge> },
        ]}
        actions={(o) => (<>
          <button type="button" aria-label={`View ${o.number}`} onClick={() => setSel(o)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-brand-deep hover:text-brand-deep"><Eye size={14} /></button>
          <button type="button" aria-label={`Invoice ${o.number}`} onClick={() => setInvoice(o)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-brand-deep hover:text-brand-deep"><FileText size={14} /></button>
        </>)} />

      {cur && (
        <Modal title={`Order ${cur.number}`} onClose={() => setSel(null)} wide>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="font-bold">Customer</p><p>{cur.customer?.name}</p><p className="text-gray-500">{cur.customer?.email}</p><p className="text-gray-500">{cur.shippingAddress.phone}</p><p className="text-gray-500">{cur.shippingAddress.line1}, {cur.shippingAddress.city}, {cur.shippingAddress.country}</p></div>
            <div><p className="font-bold">Payment and delivery</p><p>Cash on Delivery · <Badge>{cur.payment.status === 'paid' ? 'Paid' : 'Unpaid'}</Badge></p><p className="text-gray-500">{cur.delivery?.zone} · {cur.delivery?.method}{cur.delivery?.eta ? ` · ${cur.delivery.eta}` : ''}</p><p className="text-gray-500">Customer paid in {cur.currency.code}: {formatSnapshot(cur.totalDisplay, cur.currency)} (rate {cur.currency.rate}, frozen).</p></div>
          </div>
          <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
            {cur.items.map((i, k) => <li key={k} className="flex justify-between p-3"><span>{i.quantity} × {i.name}{i.model ? ` (${i.model})` : ''}{i.color ? ` · ${i.color}` : ''} <span className="text-xs text-gray-500">{i.sku}</span></span><span className="font-semibold">{money(i.lineTotal)}</span></li>)}
            <li className="flex justify-between bg-gray-50 p-3 font-extrabold"><span>Total (delivery {cur.shippingFee ? money(cur.shippingFee) : 'free'}{cur.discount ? `, discount ${money(cur.discount)}` : ''})</span><span>{money(cur.total)}</span></li>
          </ul>
          {cur.returnRequest?.status && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm"><p className="font-bold">Return {cur.returnRequest.status}</p><p>{cur.returnRequest.reason}</p>
              {cur.returnRequest.status === 'requested' && <div className="mt-2 flex gap-2"><button type="button" className="btn-outline !py-1.5" onClick={() => run(() => api.patch(`/admin/orders/${cur._id}`, { returnDecision: 'approved' }), 'Return approved')}>Approve</button><button type="button" className="btn-outline !py-1.5" onClick={() => run(() => api.patch(`/admin/orders/${cur._id}`, { returnDecision: 'rejected' }), 'Return rejected')}>Reject</button></div>}</div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="os" className="label">Status</label>
              <select id="os" className="input" value={cur.status} onChange={(e) => run(() => api.patch(`/admin/orders/${cur._id}/status`, { status: e.target.value }), `Status changed to ${e.target.value}`)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <p className="mt-1 text-xs text-gray-500">Only valid next steps are accepted by the server.</p></div>
            <div><label htmlFor="ot" className="label">Tracking reference</label><input id="ot" className="input" defaultValue={cur.tracking || ''} onBlur={(e) => e.target.value !== (cur.tracking || '') && run(() => api.patch(`/admin/orders/${cur._id}`, { tracking: e.target.value }), 'Tracking saved')} /></div>
            <div><label htmlFor="or" className="label">Refund status</label><select id="or" className="input" value={cur.refund?.status || 'none'} onChange={(e) => run(() => api.patch(`/admin/orders/${cur._id}`, { refundStatus: e.target.value }), 'Refund status saved')}>{['none', 'pending', 'refunded'].map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="sm:col-span-2"><label htmlFor="on" className="label">Internal note (not visible to the customer)</label><textarea id="on" rows={2} className="input" defaultValue={cur.internalNote || ''} onBlur={(e) => e.target.value !== (cur.internalNote || '') && run(() => api.patch(`/admin/orders/${cur._id}`, { internalNote: e.target.value }), 'Note saved')} /></div>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <button type="button" disabled={['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'].includes(cur.status)} className="btn-outline !text-red-600" onClick={() => setCancel(cur)}>Cancel order</button>
            <button type="button" className="btn-primary" onClick={() => setInvoice(cur)}><FileText size={16} /> Invoice</button>
          </div>
        </Modal>
      )}
      {invoice && <Invoice order={invoice} onClose={() => setInvoice(null)} />}
      {cancel && <ConfirmModal title="Cancel order" text={`Cancel ${cancel.number}? Reserved stock goes back to inventory.`} confirmLabel="Cancel order" onClose={() => setCancel(null)} onConfirm={async () => { await run(() => api.post(`/admin/orders/${cancel._id}/cancel`), 'Order cancelled'); setCancel(null) }} />}
    </>
  )
}
