import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Minus, Plus, Scale, SearchX, ShieldCheck, ShoppingCart, Truck } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/AsyncState'
import PageLoader from '../components/ui/PageLoader'
import ProductImage from '../components/ui/ProductImage'
import Rating from '../components/ui/Rating'
import Price from '../components/ui/Price'
import ProductRail from '../components/product/ProductRail'
import { stockLabel } from '../components/product/ProductCard'
import ReviewForm from '../components/product/ReviewForm'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { useCart, useCompare, useRecent, useUI, useWishlist } from '../store'
import { normalizeList, normalizeProduct } from '../utils/normalize'
import { applySeo } from '../utils/seo'

export default function Product() {
  const { slug } = useParams()
  const nav = useNavigate()
  const { data: p, loading, error, reload } = useFetch(() => api.get(`/catalog/products/${slug}`).then((r) => normalizeProduct(r.data)), [slug])
  const add = useCart((s) => s.add)
  const wished = useWishlist((s) => (p ? s.ids.includes(p.id) : false))
  const toggleWish = useWishlist((s) => s.toggle)
  const compared = useCompare((s) => (p ? s.ids.includes(p.id) : false))
  const toggleCompare = useCompare((s) => s.toggle)
  const pushRecent = useRecent((s) => s.push)
  const recentIds = useRecent((s) => s.ids)
  const notify = useUI((s) => s.notify)

  const [img, setImg] = useState(0)
  const [color, setColor] = useState(null)
  const [model, setModel] = useState(null)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('specs')

  useEffect(() => {
    if (!p) return
    setImg(0); setQty(1); setTab('specs')
    const models = [...new Set(p.variants.map((v) => v.model).filter(Boolean))]
    const vColors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))]
    setModel(models[0] ?? null)
    setColor(vColors[0] ?? p.colors[0]?.name ?? null)
    pushRecent(p.id)
    applySeo({
      title: p.seo?.title || `${p.name} – Volta`, description: p.seo?.description || (p.description || '').slice(0, 155), image: p.image, type: 'product',
      jsonLd: { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.description, image: p.images.map((i) => i.url), brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
        offers: { '@type': 'Offer', priceCurrency: 'BDT', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.href },
        aggregateRating: p.reviews > 0 ? { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews } : undefined },
    })
  }, [p, pushRecent])

  const { data: recent } = useFetch(() => {
    const ids = recentIds.filter((id) => id !== p?.id)
    return ids.length ? api.get('/catalog/products', { params: { ids: ids.join(',') } }).then((r) => normalizeList(r.data.items)) : Promise.resolve([])
  }, [recentIds.join(','), p?.id])

  const models = useMemo(() => (p ? [...new Set(p.variants.map((v) => v.model).filter(Boolean))] : []), [p])
  const variantColors = useMemo(() => (p ? [...new Set(p.variants.map((v) => v.color).filter(Boolean))] : []), [p])
  const colorOptions = variantColors.length ? variantColors.map((n) => ({ name: n })) : p?.colors || []
  const variant = useMemo(() => {
    if (!p || !p.variants.length) return null
    return p.variants.find((v) => (!models.length || v.model === model) && (!variantColors.length || v.color === color)) || null
  }, [p, model, color, models, variantColors])

  if (loading) return <PageLoader />
  if (error?.response?.status === 404) return <EmptyState level="h1" icon={SearchX} title="Product not found" text="This product may have been removed or the link is incorrect." cta="Browse all products" to="/shop" />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const needsVariant = p.hasVariants
  const stockCount = variant ? variant.stock : needsVariant ? 0 : p.stock
  const stock = stockLabel({ stock: stockCount })
  const price = variant?.price ?? p.price
  const maxQty = Math.max(1, Math.min(10, stockCount))
  const canBuy = stockCount > 0 && (!needsVariant || !!variant)
  const images = p.images.length ? p.images : [null]
  const addToCart = () => add(p, { variant, color, qty })

  return (
    <>
      <Breadcrumbs items={[{ label: p.categoryName || 'Shop', to: p.category ? `/shop?category=${p.category}` : '/shop' }, { label: p.name }]} />
      <div className="container-x grid gap-8 pb-8 lg:grid-cols-2">
        <div>
          <ProductImage product={p} tint={img} eager className="aspect-square w-full rounded-xl border border-gray-200" />
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {images.map((_, i) => (
                <button key={i} type="button" aria-label={`Show image ${i + 1}`} aria-current={i === img} onClick={() => setImg(i)} className={`overflow-hidden rounded-lg border-2 ${i === img ? 'border-brand-deep' : 'border-transparent'}`}>
                  <ProductImage product={p} tint={i} className="aspect-square w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {p.brand && <Link to={`/shop?q=${encodeURIComponent(p.brand)}`} className="text-sm font-bold text-brand-deep hover:underline">{p.brand}</Link>}
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <Rating value={p.rating} count={p.reviews} size={16} />
            <span>SKU {variant?.sku || p.sku}</span>
            <span className={`font-semibold ${stock.cls}`}>{stock.text}</span>
          </div>

          <div className="mt-5"><Price product={p} unit={price} size="lg" /></div>
          {p.description && <p className="mt-4 text-sm leading-6 text-gray-600">{p.description}</p>}

          {colorOptions.length > 0 && (
            <fieldset className="mt-6">
              <legend className="label">Color: <span className="font-normal text-gray-500">{color}</span></legend>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => c.hex ? (
                  <button key={c.name} type="button" aria-label={c.name} aria-pressed={color === c.name} onClick={() => setColor(c.name)} className={`h-9 w-9 rounded-full border-2 p-0.5 ${color === c.name ? 'border-brand-deep' : 'border-gray-200'}`}><span className="block h-full w-full rounded-full border border-gray-200" style={{ background: c.hex }} /></button>
                ) : (
                  <button key={c.name} type="button" aria-pressed={color === c.name} onClick={() => setColor(c.name)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${color === c.name ? 'border-brand-deep bg-brand-soft text-brand-deep' : 'border-gray-300 hover:border-brand-deep'}`}>{c.name}</button>
                ))}
              </div>
            </fieldset>
          )}

          {models.length > 0 && (
            <fieldset className="mt-5">
              <legend className="label">Model</legend>
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <button key={m} type="button" aria-pressed={model === m} onClick={() => setModel(m)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${model === m ? 'border-brand-deep bg-brand-soft text-brand-deep' : 'border-gray-300 hover:border-brand-deep'}`}>{m}</button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="grid h-11 w-11 place-items-center disabled:opacity-40"><Minus size={16} /></button>
              <span className="w-8 text-center text-sm font-bold" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)} className="grid h-11 w-11 place-items-center disabled:opacity-40"><Plus size={16} /></button>
            </div>
            <button type="button" disabled={!canBuy} onClick={() => { addToCart(); notify('Added to cart') }} className="btn-dark h-11 flex-1 sm:flex-none sm:px-8"><ShoppingCart size={17} /> Add to cart</button>
            <button type="button" disabled={!canBuy} onClick={() => { addToCart(); nav('/checkout') }} className="btn-primary h-11 flex-1 sm:flex-none sm:px-8">Buy now</button>
          </div>
          {stockCount === 0 && <p className="mt-2 text-sm font-semibold text-red-600">This option is out of stock. Save it to your wishlist to check back later.</p>}

          <div className="mt-4 flex gap-4 text-sm font-semibold">
            <button type="button" onClick={() => { toggleWish(p.id); notify(wished ? 'Removed from wishlist' : 'Saved to wishlist') }} className="flex items-center gap-1.5 hover:text-brand-deep"><Heart size={17} className={wished ? 'fill-brand-deep text-brand-deep' : ''} /> {wished ? 'Saved' : 'Add to wishlist'}</button>
            <button type="button" onClick={() => { const ok = toggleCompare(p.id); notify(!ok ? 'You can compare up to 4 products' : compared ? 'Removed from compare' : 'Added to compare') }} className="flex items-center gap-1.5 hover:text-brand-deep"><Scale size={17} className={compared ? 'text-brand-deep' : ''} /> {compared ? 'In compare' : 'Compare'}</button>
          </div>

          <ul className="mt-6 space-y-2 rounded-xl bg-gray-100 p-4 text-sm">
            <li className="flex items-center gap-2"><Truck size={17} className="text-brand-deep" /> Cash on Delivery. Delivery time and charge are shown at checkout.</li>
            <li className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-deep" /> Genuine product with warranty.</li>
          </ul>
        </div>
      </div>

      <section className="container-x pb-8">
        <div role="tablist" className="flex gap-6 border-b border-gray-200">
          {[['specs', 'Specifications'], ['desc', 'Description'], ['reviews', `Reviews (${p.reviews})`]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`-mb-px border-b-2 py-3 text-sm font-bold ${tab === id ? 'border-brand-deep text-brand-deep' : 'border-transparent text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <div role="tabpanel" className="py-6">
          {tab === 'specs' && (Object.keys(p.specs).length ? (
            <table className="w-full max-w-2xl text-sm"><tbody>
              {Object.entries(p.specs).map(([k, v]) => <tr key={k} className="border-b border-gray-100"><th scope="row" className="w-1/3 bg-gray-50 px-4 py-2.5 text-left font-semibold">{k}</th><td className="px-4 py-2.5">{v}</td></tr>)}
            </tbody></table>
          ) : <p className="text-sm text-gray-500">No specifications added yet.</p>)}
          {tab === 'desc' && <p className="max-w-2xl whitespace-pre-line text-sm leading-7 text-gray-600">{p.description || 'No description yet.'}</p>}
          {tab === 'reviews' && (
            <div className="max-w-2xl space-y-4">
              {(p.reviewList || []).length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
              {(p.reviewList || []).map((r) => (
                <div key={r._id} className="card p-4">
                  <div className="flex items-center justify-between"><span className="font-bold">{r.userName}</span><span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  <div className="mt-1 flex items-center gap-2"><Rating value={r.rating} /><span className="chip bg-brand-soft text-brand-deep">Verified purchase</span></div>
                  {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
              <ReviewForm productId={p.id} />
            </div>
          )}
        </div>
      </section>

      <ProductRail title="Related products" products={p.related || []} to={p.category ? `/shop?category=${p.category}` : '/shop'} />
      <ProductRail title="Recently viewed" products={recent || []} />
    </>
  )
}
