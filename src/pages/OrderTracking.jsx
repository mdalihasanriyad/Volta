import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { api, errMsg } from '../services/api'
import { useAuth } from '../store'

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']

export default function OrderTracking() {
  const [params] = useSearchParams()
  const user = useAuth((s) => s.user)
  const [number, setNumber] = useState(params.get('order') || '')
  const [contact, setContact] = useState(user?.email || '')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const find = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setOrder(null)
    const c = contact.trim()
    try {
      const { data } = await api.get(`/orders/track/${encodeURIComponent(number.trim().toUpperCase())}`, { params: c.includes('@') ? { email: c } : { phone: c } })
      setOrder(data)
    } catch (err) { setError(errMsg(err, 'We could not find an order matching those details.')) }
    setBusy(false)
  }
  const flow = order && !['Cancelled', 'Returned'].includes(order.status) ? FLOW : order ? [...order.statusHistory.map((h) => h.status)] : []
  const step = order ? flow.indexOf(order.status) : -1

  return (
    <>
      <Breadcrumbs items={[{ label: 'Track order' }]} />
      <div className="container-x pb-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-extrabold">Track your order</h1>
          <form onSubmit={find} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div><label htmlFor="ord" className="sr-only">Order number</label><input id="ord" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Order number, e.g. VLT-20391204" required className="input" /></div>
            <div><label htmlFor="ctc" className="sr-only">Email or phone on the order</label><input id="ctc" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone used on the order" required className="input" /></div>
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Track'}</button>
          </form>
          {error && <p role="alert" className="field-error">{error}</p>}
          {order && (
            <div className="card mt-6 p-5">
              <div className="flex items-center justify-between"><p className="font-bold">{order.number}</p><span className="chip bg-brand-soft text-brand-deep">{order.status}</span></div>
              {order.tracking && <p className="mt-2 text-sm text-gray-600">Tracking reference: <b>{order.tracking}</b></p>}
              {order.delivery?.eta && <p className="text-sm text-gray-600">Estimated delivery: {order.delivery.eta}</p>}
              <ol className="mt-5 space-y-4">
                {flow.map((s, i) => {
                  const when = order.statusHistory.find((h) => h.status === s)?.at
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? 'bg-brand-deep text-white' : 'bg-gray-100 text-gray-400'}`}>{i <= step ? <Check size={14} /> : i + 1}</span>
                      <span className={`text-sm ${i <= step ? 'font-bold' : 'text-gray-400'}`}>{s}{when && <span className="ml-2 text-xs font-normal text-gray-500">{new Date(when).toLocaleString()}</span>}</span>
                    </li>
                  )
                })}
              </ol>
              <ul className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">{order.items.map((i, k) => <li key={k}>{i.quantity} × {i.name}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
