import { useEffect, useState } from 'react'
import { useCatalog } from '../../store/catalog'

export default function FilterPanel({ params, setParams, clear }) {
  const categories = useCatalog((st) => st.categories)
  const category = params.get('category') || ''
  const cat = categories.find((c) => c.slug === category)
  const [min, setMin] = useState(params.get('min') || '')
  const [max, setMax] = useState(params.get('max') || '')
  useEffect(() => { setMin(params.get('min') || ''); setMax(params.get('max') || '') }, [params])

  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="mb-2 font-extrabold">Category</h3>
        <ul className="space-y-1">
          <li><button type="button" onClick={() => setParams({ category: '', sub: '' })} className={`hover:text-brand-deep ${!category ? 'font-bold text-brand-deep' : ''}`}>All categories</button></li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button type="button" onClick={() => setParams({ category: c.slug, sub: '' })} className={`text-left hover:text-brand-deep ${category === c.slug ? 'font-bold text-brand-deep' : ''}`}>{c.name}</button>
              {category === c.slug && (
                <ul className="mb-1 ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
                  {(cat.children || []).map((c) => c.name).map((s) => (
                    <li key={s}><button type="button" onClick={() => setParams({ sub: params.get('sub') === s ? '' : s })} className={`text-left hover:text-brand-deep ${params.get('sub') === s ? 'font-bold text-brand-deep' : 'text-gray-600'}`}>{s}</button></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-extrabold">Price (BDT)</h3>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum price" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className="input !py-2" />
          <span className="text-gray-400">–</span>
          <input aria-label="Maximum price" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} className="input !py-2" />
        </div>
        <button type="button" onClick={() => setParams({ min, max })} className="btn-outline mt-2 w-full !py-2">Apply price</button>
      </section>

      <section>
        <h3 className="mb-2 font-extrabold">Availability</h3>
        <label className="flex items-center gap-2"><input type="checkbox" checked={params.get('stock') === '1'} onChange={(e) => setParams({ stock: e.target.checked ? '1' : '' })} className="h-4 w-4 accent-brand-deep" /> In stock only</label>
      </section>

      <section>
        <h3 className="mb-2 font-extrabold">Discount</h3>
        <label className="flex items-center gap-2"><input type="checkbox" checked={params.get('discount') === '1'} onChange={(e) => setParams({ discount: e.target.checked ? '1' : '' })} className="h-4 w-4 accent-brand-deep" /> On sale</label>
      </section>

      <section>
        <h3 className="mb-2 font-extrabold">Rating</h3>
        <div className="space-y-1">
          {[4, 3].map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="radio" name="rating" checked={params.get('rating') === String(r)} onChange={() => setParams({ rating: String(r) })} className="h-4 w-4 accent-brand-deep" /> {r} stars and up
            </label>
          ))}
          <label className="flex items-center gap-2"><input type="radio" name="rating" checked={!params.get('rating')} onChange={() => setParams({ rating: '' })} className="h-4 w-4 accent-brand-deep" /> Any rating</label>
        </div>
      </section>

      <button type="button" onClick={clear} className="btn-outline w-full">Clear all filters</button>
    </div>
  )
}
