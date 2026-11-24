import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/AsyncState'
import PageLoader from '../components/ui/PageLoader'
import ProductImage from '../components/ui/ProductImage'
import Price from '../components/ui/Price'
import { stockLabel } from '../components/product/ProductCard'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { useCart, useUI, useWishlist } from '../store'
import { normalizeList } from '../utils/normalize'

export default function Wishlist() {
  const { ids, remove } = useWishlist()
  const add = useCart((s) => s.add)
  const notify = useUI((s) => s.notify)
  const key = ids.join(',')
  const { data, loading, error, reload } = useFetch(() => (key ? api.get('/catalog/products', { params: { ids: key, limit: 48 } }).then((r) => normalizeList(r.data.items)) : Promise.resolve([])), [key])
  const items = (data || []).filter((p) => ids.includes(p.id))

  return (
    <>
      <Breadcrumbs items={[{ label: 'Wishlist' }]} />
      <div className="container-x pb-10">
        <h1 className="mb-4 text-2xl font-extrabold">Wishlist ({ids.length})</h1>
        {error ? <ErrorBox error={error} onRetry={reload} /> : loading && ids.length ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet" text="Tap the heart on any product to keep it here." cta="Browse products" to="/shop" />
        ) : (
          <ul className="space-y-3">
            {items.map((p) => {
              const s = stockLabel(p)
              return (
                <li key={p.id} className="card flex items-center gap-4 p-3 md:p-4">
                  <Link to={`/product/${p.slug}`} tabIndex={-1} aria-hidden="true" className="w-20 shrink-0 md:w-24"><ProductImage product={p} className="aspect-square w-full rounded-lg" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${p.slug}`} className="line-clamp-2 font-bold hover:text-brand-deep">{p.name}</Link>
                    <p className={`text-xs font-semibold ${s.cls}`}>{s.text}</p>
                    <Price product={p} />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {p.hasVariants ? <Link to={`/product/${p.slug}`} className="btn-dark !py-2">Choose options</Link>
                      : <button type="button" disabled={p.stock === 0} onClick={() => { add(p); remove(p.id); notify('Moved to cart') }} className="btn-dark !py-2">Move to cart</button>}
                    <button type="button" onClick={() => remove(p.id)} className="btn-outline !py-2">Remove</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
