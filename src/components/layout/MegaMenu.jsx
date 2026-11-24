import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useCatalog } from '../../store/catalog'
import CategoryIcon from '../ui/CategoryIcon'

export default function MegaMenu({ onNavigate }) {
  const categories = useCatalog((st) => st.categories)
  const [active, setActive] = useState(0)
  const cat = categories[active]
  if (!cat) return null
  const subs = (cat.children || []).map((c) => c.name)
  return (
    <div className="absolute left-0 top-full z-50 flex w-[880px] max-w-[92vw] overflow-hidden rounded-b-xl border border-gray-200 bg-white text-ink shadow-card">
      <ul className="max-h-[480px] w-64 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50 py-2">
        {categories.map((c, i) => (
          <li key={c.slug}>
            <Link
              to={`/shop?category=${c.slug}`}
              onClick={onNavigate}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`flex items-center justify-between gap-2 px-4 py-2 text-sm font-semibold ${i === active ? 'bg-white text-brand-deep' : 'hover:bg-white'}`}
            >
              <span className="flex items-center gap-2.5"><CategoryIcon name={c.icon} size={17} /> {c.name}</span>
              <ChevronRight size={15} className="text-gray-400" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex min-h-[320px] flex-1 flex-col justify-between p-6">
        <div>
          <h3 className="text-lg font-extrabold">{cat.name}</h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
            {subs.map((s) => (
              <li key={s}>
                <Link to={`/shop?category=${cat.slug}&sub=${encodeURIComponent(s)}`} onClick={onNavigate} className="text-sm text-gray-600 hover:text-brand-deep hover:underline">{s}</Link>
              </li>
            ))}
          </ul>
        </div>
        <Link to={`/shop?category=${cat.slug}`} onClick={onNavigate} className="mt-6 flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3 text-sm font-bold text-brand-deep hover:bg-brand hover:text-ink">
          Shop all {cat.name}
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
