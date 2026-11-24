import { useActiveCurrency, useCurrency } from '../../store'
import { useCatalog } from '../../store/catalog'

export default function CurrencySwitcher({ className = '' }) {
  const set = useCurrency((s) => s.set)
  const currencies = useCatalog((s) => s.currencies)
  const active = useActiveCurrency()
  if (currencies.length < 2) return null
  return (
    <label className={`flex items-center ${className}`}>
      <span className="sr-only">Currency</span>
      <select value={active.code} onChange={(e) => set(e.target.value)} className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-semibold focus:border-brand-deep focus:outline-none">
        {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
      </select>
    </label>
  )
}
