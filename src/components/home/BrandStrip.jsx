import { Link } from 'react-router-dom'
import { imageUrl } from '../../utils/normalize'

export default function BrandStrip({ brands }) {
  if (!brands.length) return null
  return (
    <section className="container-x py-8">
      <h2 className="mb-4 text-xl font-extrabold md:text-2xl">Popular brands</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {brands.map((b) => (
          <Link key={b._id} to={`/shop?q=${encodeURIComponent(b.name)}`} className="grid h-16 place-items-center rounded-xl border border-gray-200 bg-white px-2 text-sm font-extrabold text-gray-600 transition-colors hover:border-brand-deep hover:text-brand-deep">
            {b.logo?.url ? <img src={imageUrl(b.logo.url, 160)} alt={b.name} loading="lazy" className="max-h-10 object-contain" /> : b.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
