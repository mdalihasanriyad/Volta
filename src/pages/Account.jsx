import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Heart, LogOut, MapPin, Package, Settings, Star, User } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import AddressForm from '../components/account/AddressForm'
import ProductGrid from '../components/product/ProductGrid'
import { ErrorBox } from '../components/ui/AsyncState'
import PageLoader from '../components/ui/PageLoader'
import useFetch from '../hooks/useFetch'
import { api, errMsg, fieldErrors } from '../services/api'
import { useAuth, useUI, useWishlist } from '../store'
import { formatBDT, formatSnapshot } from '../utils/format'
import { countryName } from '../utils/countries'
import { normalizeList } from '../utils/normalize'

const tabs = [['profile', 'Profile', User], ['orders', 'Orders', Package], ['addresses', 'Addresses', MapPin], ['wishlist', 'Wishlist', Heart], ['reviews', 'Reviews', Star], ['settings', 'Settings', Settings]]

function Profile() {
  const { user, refreshUser } = useAuth()
  const notify = useUI((s) => s.notify)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: user.name, phone: user.phone || '' } })
  const save = async (d) => { try { await api.patch('/auth/profile', { name: d.name, ...(d.phone ? { phone: d.phone } : {}) }); await refreshUser(); notify('Profile saved') } catch (e) { notify(errMsg(e)) } }
  const resend = async () => { try { await api.post('/auth/resend-verification'); notify('Verification email sent') } catch (e) { notify(errMsg(e)) } }
  return (
    <form onSubmit={handleSubmit(save)} noValidate className="max-w-lg space-y-4">
      <div><label htmlFor="pn" className="label">Full name</label><input id="pn" className="input" {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Enter your name' } })} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
      <div><label htmlFor="pe" className="label">Email</label><input id="pe" type="email" className="input" value={user.email} readOnly />
        <p className="mt-1 text-xs">{user.emailVerified ? <span className="text-emerald-600">Verified</span> : <span className="text-amber-700">Not verified. <button type="button" onClick={resend} className="font-bold underline">Resend verification email</button></span>}</p></div>
      <div><label htmlFor="pp" className="label">Phone</label><input id="pp" className="input" {...register('phone', { pattern: { value: /^$|^[+\d][\d\s-]{6,19}$/, message: 'Enter a valid phone number' } })} />{errors.phone && <p className="field-error">{errors.phone.message}</p>}</div>
      <button className="btn-primary" type="submit" disabled={isSubmitting}>Save changes</button>
    </form>
  )
}

function OrderCard({ o, onChanged }) {
  const notify = useUI((s) => s.notify)
  const user = useAuth((s) => s.user)
  const [returning, setReturning] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const act = async (fn, ok) => { setBusy(true); try { await fn(); notify(ok); onChanged() } catch (e) { notify(errMsg(e)) } setBusy(false) }
  const canCancel = ['Pending', 'Confirmed'].includes(o.status)
  const canReturn = o.status === 'Delivered' && !o.returnRequest?.status && Date.now() - new Date(o.deliveredAt || o.updatedAt).getTime() < 7 * 86400000
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-bold">{o.number}</p><p className="text-xs text-gray-500">Placed {new Date(o.createdAt).toLocaleDateString()}</p></div>
        <span className="chip bg-brand-soft text-brand-deep">{o.status}</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm text-gray-600">{o.items.map((i, k) => <li key={k}>{i.quantity} × {i.name}{i.model ? ` (${i.model})` : ''}</li>)}</ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-extrabold">{formatSnapshot(o.totalDisplay, o.currency)}{o.currency.code !== 'BDT' && <span className="ml-2 text-xs font-normal text-gray-500">({formatBDT(o.total)})</span>}</span>
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link to={`/order-tracking?order=${o.number}`} state={{ email: user.email }} className="text-brand-deep hover:underline">Track order</Link>
          {canCancel && <button type="button" disabled={busy} onClick={() => window.confirm('Cancel this order?') && act(() => api.post(`/orders/${o.number}/cancel`), 'Order cancelled')} className="text-red-600 hover:underline">Cancel order</button>}
          {canReturn && <button type="button" onClick={() => setReturning(true)} className="text-brand-deep hover:underline">Request return</button>}
        </div>
      </div>
      {o.returnRequest?.status && <p className="mt-2 text-xs text-gray-600">Return {o.returnRequest.status}{o.refund?.status && o.refund.status !== 'none' ? ` · refund ${o.refund.status}` : ''}</p>}
      {returning && (
        <div className="mt-3 space-y-2">
          <label htmlFor={`rr-${o.number}`} className="label">Why are you returning this order?</label>
          <textarea id={`rr-${o.number}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
          <div className="flex gap-2"><button type="button" className="btn-primary !py-2" disabled={busy || reason.trim().length < 5} onClick={() => act(() => api.post(`/orders/${o.number}/return`, { reason }), 'Return requested')}>Send request</button><button type="button" className="btn-outline !py-2" onClick={() => setReturning(false)}>Cancel</button></div>
        </div>
      )}
    </li>
  )
}

function Orders() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch(() => api.get('/orders', { params: { page, limit: 10 } }).then((r) => r.data), [page])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <PageLoader />
  if (!data.items.length) return <p className="text-gray-500">You have no orders yet. <Link to="/shop" className="font-bold text-brand-deep">Start shopping</Link></p>
  return (
    <>
      <ul className="space-y-3">{data.items.map((o) => <OrderCard key={o._id} o={o} onChanged={reload} />)}</ul>
      {data.pages > 1 && <div className="mt-4 flex items-center justify-center gap-3"><button className="btn-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="text-sm">Page {page} of {data.pages}</span><button className="btn-outline" disabled={page === data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>
  )
}

function Addresses() {
  const notify = useUI((s) => s.notify)
  const { data, loading, error, reload } = useFetch(() => api.get('/addresses').then((r) => r.data), [])
  const [editing, setEditing] = useState(null) // address doc, or {} for a new one
  const [busy, setBusy] = useState(false)
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <PageLoader />
  const save = async (v) => {
    setBusy(true)
    const body = { fullName: v.fullName, phone: v.phone, country: v.country, city: v.city, line1: v.line1, postcode: v.postcode || undefined, isDefault: !!v.isDefault }
    try { editing._id ? await api.patch(`/addresses/${editing._id}`, body) : await api.post('/addresses', body); notify('Address saved'); setEditing(null); reload() } catch (e) { notify(Object.values(fieldErrors(e))[0] || errMsg(e)) }
    setBusy(false)
  }
  const remove = async (a) => { if (!window.confirm('Delete this address?')) return; try { await api.delete(`/addresses/${a._id}`); reload() } catch (e) { notify(errMsg(e)) } }
  if (editing) return <div className="card max-w-2xl p-5"><AddressForm defaults={editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy} /></div>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((a) => (
        <div key={a._id} className="card p-4 text-sm">
          {a.isDefault && <span className="chip mb-2">Default</span>}
          <p className="font-bold">{a.fullName}</p><p className="text-gray-600">{a.line1}, {a.city}, {countryName(a.country)}</p><p className="text-gray-500">{a.phone}</p>
          <div className="mt-3 flex gap-3 font-semibold"><button type="button" className="text-brand-deep hover:underline" onClick={() => setEditing(a)}>Edit</button><button type="button" className="text-red-600 hover:underline" onClick={() => remove(a)}>Delete</button></div>
        </div>
      ))}
      <button type="button" onClick={() => setEditing({})} className="grid min-h-[110px] place-items-center rounded-xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:border-brand-deep hover:text-brand-deep">Add new address</button>
    </div>
  )
}

function Wish() {
  const ids = useWishlist((s) => s.ids)
  const key = ids.join(',')
  const { data, loading, error, reload } = useFetch(() => (key ? api.get('/catalog/products', { params: { ids: key, limit: 48 } }).then((r) => normalizeList(r.data.items)) : Promise.resolve([])), [key])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading && ids.length) return <PageLoader />
  return data?.length ? <ProductGrid products={data} className="grid-cols-2 xl:grid-cols-3" /> : <p className="text-gray-500">Nothing saved yet. <Link to="/shop" className="font-bold text-brand-deep">Browse products</Link></p>
}

function Reviews() {
  const { data, loading, error, reload } = useFetch(() => api.get('/reviews/mine').then((r) => r.data), [])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <PageLoader />
  if (!data.length) return <p className="max-w-md text-gray-500">You can review a product after it has been delivered. Open the product page and use “Write a review”.</p>
  return <ul className="space-y-3">{data.map((r) => <li key={r._id} className="card p-4 text-sm"><div className="flex items-center justify-between"><Link to={`/product/${r.product?.slug}`} className="font-bold hover:text-brand-deep">{r.product?.name}</Link><span className="chip">{r.status}</span></div><p className="mt-1">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>{r.comment && <p className="mt-1 text-gray-600">{r.comment}</p>}</li>)}</ul>
}

function Security() {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()
  const notify = useUI((s) => s.notify)
  const save = async (d) => { try { const { data } = await api.patch('/auth/password', { currentPassword: d.current, newPassword: d.next }); notify(data.message); reset() } catch (e) { notify(errMsg(e)) } }
  return (
    <form onSubmit={handleSubmit(save)} className="max-w-lg space-y-4" noValidate>
      <h2 className="text-lg font-extrabold">Change password</h2>
      <div><label htmlFor="cp" className="label">Current password</label><input id="cp" type="password" autoComplete="current-password" className="input" {...register('current', { required: 'Enter your current password' })} />{errors.current && <p className="field-error">{errors.current.message}</p>}</div>
      <div><label htmlFor="np" className="label">New password</label><input id="np" type="password" autoComplete="new-password" className="input" {...register('next', { required: 'Enter a new password', minLength: { value: 8, message: 'Use at least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />{errors.next && <p className="field-error">{errors.next.message}</p>}</div>
      <div><label htmlFor="rp" className="label">Repeat new password</label><input id="rp" type="password" autoComplete="new-password" className="input" {...register('repeat', { validate: (v) => v === watch('next') || 'Passwords do not match' })} />{errors.repeat && <p className="field-error">{errors.repeat.message}</p>}</div>
      <button className="btn-primary" type="submit" disabled={isSubmitting}>Update password</button>
    </form>
  )
}

const panels = { profile: Profile, orders: Orders, addresses: Addresses, wishlist: Wish, reviews: Reviews, settings: Security }

export default function Account() {
  const [params, setParams] = useSearchParams()
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const tab = panels[params.get('tab')] ? params.get('tab') : 'profile'
  const Panel = panels[tab]
  return (
    <>
      <Breadcrumbs items={[{ label: 'My account' }]} />
      <div className="container-x grid gap-8 pb-10 lg:grid-cols-[240px_1fr]">
        <aside className="min-w-0">
          <p className="mb-3 text-sm text-gray-500">Signed in as <span className="font-bold text-ink">{user.name}</span></p>
          <nav aria-label="Account" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map(([id, label, Icon]) => <button key={id} type="button" aria-current={tab === id} onClick={() => setParams({ tab: id })} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${tab === id ? 'bg-ink text-white' : 'bg-gray-100 hover:bg-brand-soft'}`}><Icon size={17} /> {label}</button>)}
            <button type="button" onClick={async () => { await logout(); nav('/') }} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={17} /> Sign out</button>
          </nav>
        </aside>
        <div className="min-w-0"><h1 className="mb-5 text-2xl font-extrabold">{tabs.find((t) => t[0] === tab)[1]}</h1><Panel /></div>
      </div>
    </>
  )
}
