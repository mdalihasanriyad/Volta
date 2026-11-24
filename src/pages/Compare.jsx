import { Link } from 'react-router-dom'
import { Scale, X } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import ProductImage from '../components/ui/ProductImage'
import Price from '../components/ui/Price'
import { stockLabel } from '../components/product/ProductCard'
import { ErrorBox } from '../components/ui/AsyncState'
import PageLoader from '../components/ui/PageLoader'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { normalizeList } from '../utils/normalize'
import { useCart, useCompare, useUI } from '../store'

export default function Compare() {
  const { ids, remove, clear } = useCompare()
  const add = useCart((s) => s.add)
  const notify = useUI((s) => s.notify)
  const key = ids.join(',')
  const { data, loading, error, reload } = useFetch(() => (key ? api.get('/catalog/products', { params: { ids: key, limit: 4 } }).then((r) => normalizeList(r.data.items)) : Promise.resolve([])), [key])
  const items = (data || []).filter((p) => ids.includes(p.id))

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading && ids.length) return <PageLoader />
  if (items.length === 0) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Compare' }]} />
        <EmptyState level="h1" icon={Scale} title="No products to compare" text="Use the scale icon on a product to add up to 4 products." cta="Browse products" to="/shop" />
      </>
    )
  }
  const specKeys = [...new Set(items.flatMap((p) => Object.keys(p.specs)))]

  return (
    <>
      <Breadcrumbs items={[{ label: 'Compare' }]} />
      <div className="container-x pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Compare products</h1>
          <button type="button" onClick={clear} className="btn-outline">Clear all</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="align-top">
                <th className="w-36 bg-gray-50 p-3 text-left font-bold">Product</th>
                {items.map((p) => (
                  <th key={p.id} className="relative min-w-[180px] p-3 text-left font-normal">
                    <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)} className="absolute right-2 top-2 text-gray-400 hover:text-red-600"><X size={16} /></button>
                    <ProductImage product={p} className="mb-2 aspect-square w-24 rounded-lg" />
                    <Link to={`/product/${p.slug}`} className="block font-bold hover:text-brand-deep">{p.name}</Link>
                    {p.hasVariants ? <Link to={`/product/${p.slug}`} className="btn-dark mt-2 !py-1.5 !text-xs">Choose options</Link> : <button type="button" disabled={p.stock === 0} onClick={() => { add(p); notify('Added to cart') }} className="btn-dark mt-2 !py-1.5 !text-xs">Add to cart</button>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100"><th scope="row" className="bg-gray-50 p-3 text-left font-semibold">Price</th>{items.map((p) => <td key={p.id} className="p-3"><Price product={p} /></td>)}</tr>
              <tr className="border-t border-gray-100"><th scope="row" className="bg-gray-50 p-3 text-left font-semibold">Availability</th>{items.map((p) => <td key={p.id} className={`p-3 font-semibold ${stockLabel(p).cls}`}>{stockLabel(p).text}</td>)}</tr>
              {specKeys.map((k) => (
                <tr key={k} className="border-t border-gray-100"><th scope="row" className="bg-gray-50 p-3 text-left font-semibold">{k}</th>{items.map((p) => <td key={p.id} className="p-3">{p.specs[k] ?? '–'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
