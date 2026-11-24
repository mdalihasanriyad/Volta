import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import ProductCard from './ProductCard'

export default function ProductRail({ title, subtitle, to, products }) {
  const ref = useRef(null)
  if (!products.length) return null
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 640, behavior: 'smooth' })
  return (
    <section className="container-x py-6 md:py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {to && <Link to={to} className="text-sm font-semibold text-brand-deep hover:underline">View all</Link>}
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="btn-outline hidden h-9 w-9 !p-0 md:inline-flex"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="btn-outline hidden h-9 w-9 !p-0 md:inline-flex"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:gap-4 md:px-0">
        {products.map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}
