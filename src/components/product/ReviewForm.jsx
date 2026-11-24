import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { useAuth, useUI } from '../../store'

// Only customers with a DELIVERED order containing this product can review it (the server checks again).
export default function ReviewForm({ productId }) {
  const user = useAuth((s) => s.user)
  const notify = useUI((s) => s.notify)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const { data: orders } = useFetch(() => (user ? api.get('/orders', { params: { limit: 30 } }).then((r) => r.data.items) : Promise.resolve([])), [user?.id])
  const { data: mine } = useFetch(() => (user ? api.get('/reviews/mine').then((r) => r.data) : Promise.resolve([])), [user?.id, done])

  if (!user) return <p className="text-sm text-gray-500"><Link to="/login" state={{ from: window.location.pathname }} className="font-bold text-brand-deep">Sign in</Link> to review products you have received.</p>
  const order = (orders || []).find((o) => o.status === 'Delivered' && o.items.some((i) => String(i.product) === productId) && !(mine || []).some((r) => String(r.order) === String(o._id) && String(r.product?._id) === productId))
  if (done) return <p className="text-sm font-semibold text-emerald-600">Thanks! Your review will appear after moderation.</p>
  if (!order) return <p className="text-sm text-gray-500">Only customers who received this product can write a review.</p>

  const submit = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api.post('/reviews', { product: productId, order: order._id, rating, comment }); setDone(true) } catch (err) { notify(errMsg(err)) }
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <p className="font-bold">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)}><Star size={24} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} /></button>)}
      </div>
      <label htmlFor="rv" className="sr-only">Your review</label>
      <textarea id="rv" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like or dislike?" className="input" />
      <button className="btn-primary" type="submit" disabled={busy}>Submit review</button>
    </form>
  )
}
