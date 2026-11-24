import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, MailWarning, ShoppingCart } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import AddressForm from '../components/account/AddressForm'
import useFetch from '../hooks/useFetch'
import { api, errMsg } from '../services/api'
import { useActiveCurrency, useAuth, useCart, useUI } from '../store'
import { useCartLines } from '../utils/cart'
import { formatBDT, formatSnapshot } from '../utils/format'
import { countryName } from '../utils/countries'

const METHODS = [{ id: 'standard', name: 'Standard delivery' }, { id: 'express', name: 'Express delivery' }]
const pickAddress = (a) => ({ fullName: a.fullName, phone: a.phone, country: a.country, city: a.city, line1: a.line1, postcode: a.postcode || undefined })

export default function Checkout() {
  const lines = useCartLines()
  const clearLocal = useCart((s) => s.clearLocal)
  const { user, refreshUser } = useAuth()
  const notify = useUI((s) => s.notify)
  const currency = useActiveCurrency()
  const { data: saved, reload: reloadSaved } = useFetch(() => api.get('/addresses').then((r) => r.data), [])

  const [addr, setAddr] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saveAddr, setSaveAddr] = useState(true)
  const [method, setMethod] = useState('standard')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponErr, setCouponErr] = useState('')
  const [quote, setQuote] = useState(null)
  const [quoteErr, setQuoteErr] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [accept, setAccept] = useState(false)
  const [busy, setBusy] = useState(false)
  const [placeErr, setPlaceErr] = useState('')
  const [placed, setPlaced] = useState(null)

  const items = useMemo(() => lines.map((l) => ({ product: l.productId, variant: l.variantId || undefined, color: l.color || undefined, quantity: l.qty })), [lines])
  const itemsKey = JSON.stringify(items)

  useEffect(() => { // preselect the default saved address once loaded
    if (saved && !addr && !showForm) { const d = saved.find((a) => a.isDefault) || saved[0]; if (d) setAddr({ ...pickAddress(d), _id: d._id }); else setShowForm(true) }
  }, [saved, addr, showForm])

  // Ask the server for the real totals (prices, coupon, delivery charge, COD availability) whenever something changes.
  useEffect(() => {
    if (!addr || !items.length) { setQuote(null); return undefined }
    let alive = true
    setQuoting(true); setQuoteErr('')
    const t = setTimeout(() => {
      api.post('/checkout/quote', { items, couponCode: coupon || undefined, deliveryMethod: method, currency: currency.code, shippingAddress: { country: addr.country, city: addr.city } })
        .then((r) => alive && setQuote(r.data))
        .catch((e) => {
          if (!alive) return
          setQuote(null)
          const msg = errMsg(e)
          if (coupon && /coupon/i.test(msg)) { setCouponErr(msg); setCoupon('') } else setQuoteErr(msg)
        })
        .finally(() => alive && setQuoting(false))
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [itemsKey, addr?.country, addr?.city, method, coupon, currency.code, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  if (placed) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={52} />
          <h1 className="mt-4 text-2xl font-extrabold">Order placed</h1>
          <p className="mt-2 text-gray-500">Thank you, {user.name.split(' ')[0]}. Please pay {formatSnapshot(placed.totalDisplay, placed.currency)} in cash when your order arrives.</p>
          <dl className="mt-6 space-y-2 rounded-lg bg-gray-100 p-4 text-left text-sm">
            <div className="flex justify-between"><dt>Order number</dt><dd className="font-bold">{placed.number}</dd></div>
            <div className="flex justify-between"><dt>Payment</dt><dd className="font-bold">Cash on Delivery (unpaid)</dd></div>
            <div className="flex justify-between"><dt>Status</dt><dd className="font-bold">{placed.status}</dd></div>
            <div className="flex justify-between"><dt>Recorded total</dt><dd className="font-bold">{formatBDT(placed.total)}{placed.currency.code !== 'BDT' && ` (${placed.currency.code} at 1 BDT = ${placed.currency.rate})`}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-gray-500">A confirmation email is on its way.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to={`/order-tracking?order=${placed.number}`} className="btn-primary">Track order</Link>
            <Link to="/account?tab=orders" className="btn-outline">My orders</Link>
          </div>
        </div>
      </div>
    )
  }
  if (lines.length === 0) return <EmptyState level="h1" icon={ShoppingCart} title="Your cart is empty" text="Add products to your cart before checking out." cta="Start shopping" to="/shop" />

  const submitAddress = async (values) => {
    const a = pickAddress(values)
    if (saveAddr) { try { const { data } = await api.post('/addresses', { ...a, isDefault: !!values.isDefault }); setAddr({ ...a, _id: data._id }); reloadSaved() } catch (e) { notify(errMsg(e)); setAddr(a) } } else setAddr(a)
    setShowForm(false)
  }
  const applyCoupon = (e) => { e.preventDefault(); setCouponErr(''); if (couponInput.trim()) { setCoupon(couponInput.trim().toUpperCase()); setCouponInput('') } }

  const unverified = !user.emailVerified
  const stockIssues = quote?.issues || []
  const canPlace = !!quote?.deliverable && quote.cod.available && stockIssues.length === 0 && accept && !unverified && !busy && !quoting

  const place = async () => {
    setBusy(true); setPlaceErr('')
    try {
      const { data } = await api.post('/orders', { items, couponCode: coupon || undefined, deliveryMethod: method, currency: currency.code, shippingAddress: pickAddress(addr), acceptCod: true })
      clearLocal(); setPlaced(data)
    } catch (e) { setPlaceErr(errMsg(e)); setNonce((n) => n + 1) }
    setBusy(false)
  }
  const resend = async () => { try { await api.post('/auth/resend-verification'); notify('Verification email sent') } catch (e) { notify(errMsg(e)) } }
  const fmt = (v) => formatSnapshot(v, quote.currency)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <div className="container-x grid gap-8 pb-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <h1 className="text-2xl font-extrabold">Checkout</h1>
          {unverified && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <MailWarning size={20} className="shrink-0" />
              <p className="flex-1">Verify your email address to place orders. We sent a link to <b>{user.email}</b>.</p>
              <button type="button" className="btn-outline !py-1.5" onClick={resend}>Resend email</button>
              <button type="button" className="btn-outline !py-1.5" onClick={refreshUser}>I verified</button>
            </div>
          )}

          <section className="card p-5">
            <h2 className="text-lg font-extrabold">1. Shipping address</h2>
            {!showForm && saved && saved.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {saved.map((a) => (
                  <label key={a._id} className={`cursor-pointer rounded-lg border p-3 text-sm ${addr?._id === a._id ? 'border-brand-deep bg-brand-soft' : 'border-gray-300'}`}>
                    <input type="radio" name="addr" className="mr-2 accent-brand-deep" checked={addr?._id === a._id} onChange={() => setAddr({ ...pickAddress(a), _id: a._id })} />
                    <span className="font-bold">{a.fullName}</span> {a.isDefault && <span className="chip ml-1">Default</span>}
                    <span className="mt-1 block text-gray-600">{a.line1}, {a.city}, {countryName(a.country)}</span><span className="text-gray-500">{a.phone}</span>
                  </label>
                ))}
              </div>
            )}
            {!showForm && addr && !addr._id && <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm"><b>{addr.fullName}</b>, {addr.line1}, {addr.city}, {countryName(addr.country)}</p>}
            {!showForm && <button type="button" className="btn-outline mt-4" onClick={() => setShowForm(true)}>{saved?.length || addr ? 'Use a different address' : 'Add address'}</button>}
            {showForm && (
              <div className="mt-4">
                <AddressForm defaults={{ fullName: user.name, phone: user.phone || '' }} onSubmit={submitAddress} onCancel={saved?.length || addr ? () => setShowForm(false) : undefined} submitLabel="Use this address" showDefault={saveAddr} />
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save this address for next time</label>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-extrabold">2. Delivery method</h2>
            <div className="mt-4 space-y-2">
              {METHODS.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 p-3 has-[:checked]:border-brand-deep has-[:checked]:bg-brand-soft">
                  <input type="radio" name="method" className="h-4 w-4 accent-brand-deep" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <span className="text-sm font-bold">{m.name}</span>
                </label>
              ))}
            </div>
            {quote?.zone && <p className="mt-3 text-sm text-gray-600">Zone: {quote.zone.name}{quote.zone.eta ? `. Estimated delivery ${quote.zone.eta}.` : '.'}</p>}
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-extrabold">3. Payment</h2>
            <p className="mt-2 text-sm text-gray-600">Cash on Delivery is the only payment method. You pay the delivery person when the order arrives.</p>
            <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-deep" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> I confirm that I will pay the total in cash on delivery.</label>
          </section>
        </div>

        <aside>
          <div className="space-y-4 lg:sticky lg:top-32">
            <form onSubmit={applyCoupon} className="card p-5">
              <label htmlFor="coupon" className="label">Coupon code</label>
              {coupon ? <p className="flex items-center justify-between text-sm"><span className="chip bg-brand-soft text-brand-deep">{coupon}</span><button type="button" onClick={() => setCoupon('')} className="font-semibold text-red-600">Remove</button></p>
                : <div className="flex gap-2"><input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter code" className="input" /><button className="btn-outline shrink-0" type="submit">Apply</button></div>}
              {couponErr && <p className="field-error">{couponErr}</p>}
            </form>

            <div className="card p-5">
              <h2 className="text-lg font-extrabold">Order summary</h2>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">{lines.map((l) => <li key={l.key} className="flex justify-between gap-2"><span className="truncate">{l.qty} × {l.product.name}{l.model ? ` (${l.model})` : ''}</span></li>)}</ul>
              {!addr && <p className="mt-4 text-sm text-gray-500">Add a shipping address to see delivery charges and your final total.</p>}
              {quoteErr && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{quoteErr}</p>}
              {quote && !quote.deliverable && <p role="alert" className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" /> {quote.message}</p>}
              {quote?.deliverable && !quote.cod.available && <p role="alert" className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" /> {quote.cod.message}</p>}
              {stockIssues.length > 0 && <ul role="alert" className="mt-4 list-disc rounded-lg bg-red-50 p-3 pl-6 text-sm text-red-700">{stockIssues.map((s) => <li key={s}>{s}</li>)}</ul>}
              {quote?.deliverable && (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-semibold">{fmt(quote.display.subtotal)}</dd></div>
                  {quote.totals.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd className="font-semibold">-{fmt(quote.display.discount)}</dd></div>}
                  <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd className="font-semibold">{quote.totals.shipping === 0 ? 'Free' : fmt(quote.display.shipping)}</dd></div>
                  <div className="flex justify-between border-t border-gray-200 pt-3 text-base"><dt className="font-extrabold">Total ({quote.currency.code})</dt><dd className="font-extrabold">{fmt(quote.display.total)}</dd></div>
                  {quote.currency.code !== 'BDT' && <p className="text-xs text-gray-500">Your order is recorded as {formatBDT(quote.totals.total)} at 1 BDT = {quote.currency.rate} {quote.currency.code}.</p>}
                </dl>
              )}
              {placeErr && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{placeErr}</p>}
              <button type="button" onClick={place} disabled={!canPlace} className="btn-primary mt-5 w-full">{busy ? 'Placing order…' : quoting ? 'Updating totals…' : 'Place order'}</button>
              {!accept && quote?.deliverable && quote.cod.available && <p className="mt-2 text-xs text-gray-500">Confirm Cash on Delivery to place your order.</p>}
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
