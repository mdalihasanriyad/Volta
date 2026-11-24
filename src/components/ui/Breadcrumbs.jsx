import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="container-x flex flex-wrap items-center gap-1 py-4 text-sm text-gray-500">
      <Link to="/" className="hover:text-brand-deep">Home</Link>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={14} />
          {it.to ? <Link to={it.to} className="hover:text-brand-deep">{it.label}</Link> : <span className="font-semibold text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}
