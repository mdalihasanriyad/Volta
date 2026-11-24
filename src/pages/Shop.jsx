import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, SearchX } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import ProductGrid from '../components/product/ProductGrid'
import FilterPanel from '../components/product/FilterPanel'
import { ErrorBox, GridSkeleton } from '../components/ui/AsyncState'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { useCatalog } from '../store/catalog'
import { normalizeList } from '../utils/normalize'
import { applySeo, seoFor } from '../utils/seo'

const PAGE_SIZE = 12
const sorts = [
  ['relevance', 'Relevance'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'], ['popular', 'Most popular'], ['best', 'Best selling'],
]

export default function Shop() {
  const [params, setSearch] = useSearchParams()
  const [mobileFilters, setMobileFilters] = useState(false)

  const setParams = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in patch)) next.delete('page')
    setSearch(next)
  }
  const clear = () => setSearch(new URLSearchParams())

  const q = (params.get('q') || '').trim()
  const category = params.get('category') || ''
  const sub = params.get('sub') || ''
  const sort = params.get('sort') || 'relevance'
  const page = Math.max(1, Number(params.get('page')) || 1)

  // Filtering, sorting and pagination all happen on the server.
  const query = Object.fromEntries([...params.entries()].filter(([k, v]) => v && ['q', 'category', 'sub', 'min', 'max', 'stock', 'discount', 'rating', 'sort', 'page'].includes(k)))
  const { data, loading, error, reload } = useFetch(
    () => api.get('/catalog/products', { params: { ...query, sort: query.sort === 'relevance' ? undefined : query.sort, limit: PAGE_SIZE } }).then((r) => ({ ...r.data, items: normalizeList(r.data.items) })),
    [params.toString()]
  )
  const bySlug = useCatalog((st) => st.bySlug)
  const visible = data?.items || []
  const total = data?.total || 0
  const pages = data?.pages || 1
  const current = Math.min(page, pages)
  const title = q ? `Results for “${params.get('q')}”` : sub || bySlug[category]?.name || 'All products'

  const seoPages = useCatalog((st) => st.settings.seoPages)
  useEffect(() => {
    const e = seoFor(seoPages, category ? `/shop?category=${category}` : '/shop')
    applySeo({ title: e?.title || `${title} – Volta`, description: e?.description || `Browse ${title.toLowerCase()} at Volta with Cash on Delivery.` })
  }, [title, category, seoPages])

  const crumbs = [{ label: 'Shop', to: category || sub || q ? '/shop' : undefined }]
  if (category) crumbs.push({ label: bySlug[category]?.name || category, to: sub ? `/shop?category=${category}` : undefined })
  if (sub) crumbs.push({ label: sub })

  const panel = <FilterPanel params={params} setParams={setParams} clear={clear} />

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <div className="container-x grid gap-8 pb-10 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-32">{panel}</div></aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">{title}</h1>
              <p className="text-sm text-gray-500">{loading ? 'Loading…' : `${total} ${total === 1 ? 'product' : 'products'}`}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMobileFilters(true)} className="btn-outline lg:hidden"><SlidersHorizontal size={16} /> Filters</button>
              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-gray-500 sm:inline">Sort by</span>
                <select value={sort} onChange={(e) => setParams({ sort: e.target.value === 'relevance' ? '' : e.target.value })} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold focus:border-brand-deep focus:outline-none">
                  {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error ? <ErrorBox error={error} onRetry={reload} /> : loading ? <GridSkeleton count={PAGE_SIZE} className="grid-cols-2 md:grid-cols-3" /> : visible.length === 0 ? (
            <EmptyState icon={SearchX} title="No products match your filters" text="Try removing a filter or searching a different brand or SKU." cta="Clear filters" to="/shop" />
          ) : (
            <ProductGrid products={visible} className="grid-cols-2 md:grid-cols-3" />
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button type="button" disabled={current === 1} onClick={() => setParams({ page: String(current - 1) })} className="btn-outline">Previous</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-current={n === current ? 'page' : undefined} onClick={() => setParams({ page: String(n) })} className={`h-10 w-10 rounded-lg text-sm font-bold ${n === current ? 'bg-ink text-white' : 'border border-gray-300 hover:border-brand-deep'}`}>{n}</button>
              ))}
              <button type="button" disabled={current === pages} onClick={() => setParams({ page: String(current + 1) })} className="btn-outline">Next</button>
            </nav>
          )}
        </div>
      </div>

      {mobileFilters && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-ink/50" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Filters</h2>
              <button type="button" aria-label="Close" onClick={() => setMobileFilters(false)}><X size={22} /></button>
            </div>
            {panel}
            <button type="button" onClick={() => setMobileFilters(false)} className="btn-primary mt-5 w-full">Show {total} products</button>
          </div>
        </div>
      )}
    </>
  )
}
