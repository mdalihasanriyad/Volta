import { Link } from 'react-router-dom'
import { Heart, Scale, ShoppingCart } from 'lucide-react'
import ProductImage from '../ui/ProductImage'
import Rating from '../ui/Rating'
import Price from '../ui/Price'
import { useCart, useWishlist, useCompare, useUI } from '../../store'
import { discountPct } from '../../utils/format'

export function stockLabel(p) {
  if (p.stock === 0) return { text: 'Out of stock', cls: 'text-red-600' }
  if (p.stock <= 8) return { text: `Only ${p.stock} left`, cls: 'text-amber-600' }
  return { text: 'In stock', cls: 'text-emerald-600' }
}

export default function ProductCard({ product: p }) {
  const add = useCart((s) => s.add)
  const wished = useWishlist((s) => s.ids.includes(p.id))
  const toggleWish = useWishlist((s) => s.toggle)
  const compared = useCompare((s) => s.ids.includes(p.id))
  const toggleCompare = useCompare((s) => s.toggle)
  const notify = useUI((s) => s.notify)
  const stock = stockLabel(p)
  const pct = discountPct(p)

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-card">
      <Link to={`/product/${p.slug}`} className="block">
        <div className="relative">
          <ProductImage product={p} className="aspect-square w-full" />
          {pct > 0 && <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-white">-{pct}%</span>}
          {p.isNew && !pct && <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-ink">New</span>}
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          onClick={() => { toggleWish(p.id); notify(wished ? 'Removed from wishlist' : 'Saved to wishlist') }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm hover:text-brand-deep"
        >
          <Heart size={16} className={wished ? 'fill-brand-deep text-brand-deep' : ''} />
        </button>
        <button
          type="button"
          aria-label={compared ? 'Remove from compare' : 'Add to compare'}
          aria-pressed={compared}
          onClick={() => {
            const ok = toggleCompare(p.id)
            notify(!ok ? 'You can compare up to 4 products' : compared ? 'Removed from compare' : 'Added to compare')
          }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm hover:text-brand-deep"
        >
          <Scale size={16} className={compared ? 'text-brand-deep' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-xs font-semibold text-brand-deep">{p.brand}</p>
        <Link to={`/product/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 hover:text-brand-deep">{p.name}</Link>
        <p className="text-xs text-gray-400">SKU {p.sku}</p>
        <Rating value={p.rating} count={p.reviews} />
        <Price product={p} />
        <p className={`text-xs font-semibold ${stock.cls}`}>{stock.text}</p>
        {p.hasVariants ? (
          <Link to={`/product/${p.slug}`} className="btn-outline mt-auto w-full">Choose options</Link>
        ) : (
          <button type="button" disabled={p.stock === 0} onClick={() => { add(p); notify('Added to cart') }} className="btn-dark mt-auto w-full">
            <ShoppingCart size={16} /> Add to cart
          </button>
        )}
      </div>
    </article>
  )
}
