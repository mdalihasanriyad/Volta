import { useRef, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useDebounce from '../../hooks/useDebounce'
import { api } from '../../services/api'
import { useMoney } from '../../utils/format'

export default function SearchBar({ autoFocus = false, onDone }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const dq = useDebounce(q, 250)
  const nav = useNavigate()
  const money = useMoney()
  const box = useRef(null)

  const [results, setResults] = useState([])
  useEffect(() => {
    const t = dq.trim()
    if (t.length < 2) { setResults([]); return }
    let alive = true
    api.get('/catalog/products/suggest', { params: { q: t } }).then((r) => alive && setResults(r.data)).catch(() => alive && setResults([]))
    return () => { alive = false }
  }, [dq])

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setOpen(false)
    nav(`/shop?q=${encodeURIComponent(q.trim())}`)
    onDone?.()
  }

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-brand-deep focus-within:ring-2 focus-within:ring-brand/30">
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          type="search"
          aria-label="Search products"
          placeholder="Search by product, SKU or brand"
          className="w-full bg-transparent px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none"
        />
        <button type="submit" aria-label="Search" className="bg-brand px-4 text-ink transition-colors hover:bg-brand-deep hover:text-white">
          <Search size={18} />
        </button>
      </form>
      {open && dq.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No products match “{dq}”. Try a brand or SKU.</p>
          ) : (
            <ul>
              {results.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setQ(''); nav(`/product/${p.slug}`); onDone?.() }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-gray-500">{p.brandName} · {p.sku}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold">{money(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
