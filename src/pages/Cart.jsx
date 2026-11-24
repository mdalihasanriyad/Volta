import { Link } from 'react-router-dom'
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import ProductImage from '../components/ui/ProductImage'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { useCart } from '../store'
import { cartSubtotal, useCartLines } from '../utils/cart'
import { useMoney } from '../utils/format'

export default function Cart() {
  const lines = useCartLines()
  const { setQty, remove } = useCart()
  const money = useMoney()
  const ids = [...new Set(lines.map((l) => l.productId))].join(',')

  // Refresh prices and stock from the server whenever the cart page opens.
  useFetch(async () => {
    if (!ids) return null
    const { data } = await api.get('/catalog/products', { params: { ids, limit: 48 } })
    const byId = Object.fromEntries(data.items.map((p) => [p._id, p]))
    useCart.setState((s) => ({
      items: s.items.map((it) => {
        const p = byId[it.productId]
        if (!p) return { ...it, snap: { ...it.snap, unavailable: true, stock: 0 } }
        if (it.variantId) return { ...it, snap: { ...it.snap, unavailable: false } }
        return { ...it, snap: { ...it.snap, unavailable: false, price: p.price, stock: p.stock, image: p.images?.[0]?.url || it.snap.image } }
      }),
    }))
    return null
  }, [ids])

  if (lines.length === 0) return <EmptyState level="h1" icon={ShoppingCart} title="Your cart is empty" text="Add a few products and they will show up here." cta="Start shopping" to="/shop" />
  const blocked = lines.some((l) => l.snap.unavailable || l.snap.stock < 1)

  return (
    <>
      <Breadcrumbs items={[{ label: 'Cart' }]} />
      <div className="container-x grid gap-8 pb-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="mb-4 text-2xl font-extrabold">Shopping cart ({lines.length})</h1>
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.key} className="card flex gap-4 p-3 md:p-4">
                <Link to={`/product/${l.product.slug}`} tabIndex={-1} aria-hidden="true" className="w-24 shrink-0 md:w-28"><ProductImage product={l.product} className="aspect-square w-full rounded-lg" /></Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link to={`/product/${l.product.slug}`} className="line-clamp-2 font-bold hover:text-brand-deep">{l.product.name}</Link>
                  <p className="text-xs text-gray-500">{[l.color, l.model].filter(Boolean).join(' · ')} {l.color || l.model ? '· ' : ''}SKU {l.product.sku}</p>
                  {(l.snap.unavailable || l.snap.stock < 1) && <p className="flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle size={13} /> {l.snap.unavailable ? 'No longer available' : 'Out of stock'}. Remove it to continue.</p>}
                  <p className="text-sm font-semibold">{money(l.unit)}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-gray-300">
                      <button type="button" aria-label="Decrease quantity" onClick={() => setQty(l.key, l.qty - 1)} className="grid h-9 w-9 place-items-center"><Minus size={14} /></button>
                      <span className="w-7 text-center text-sm font-bold">{l.qty}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => setQty(l.key, Math.min(l.qty + 1, Math.max(1, l.snap.stock)))} className="grid h-9 w-9 place-items-center"><Plus size={14} /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold">{money(l.total)}</span>
                      <button type="button" aria-label={`Remove ${l.product.name}`} onClick={() => remove(l.key)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <aside>
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-bold">{money(cartSubtotal(lines))}</span></div>
            <p className="mt-2 text-xs text-gray-500">Delivery charge, coupons and the final total are confirmed at checkout. Payment is Cash on Delivery.</p>
            <Link to="/checkout" aria-disabled={blocked} onClick={(e) => blocked && e.preventDefault()} className={`btn-primary mt-4 w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`}>Proceed to checkout</Link>
            <Link to="/shop" className="mt-2 block text-center text-sm font-semibold text-brand-deep hover:underline">Continue shopping</Link>
          </div>
        </aside>
      </div>
    </>
  )
}
