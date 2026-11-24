import { Link } from 'react-router-dom'
import CategoryIcon from '../ui/CategoryIcon'
import { imageUrl } from '../../utils/normalize'

export default function FeaturedCategories({ categories }) {
  if (!categories.length) return null
  return (
    <section className="container-x py-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-extrabold md:text-2xl">Shop by category</h2>
        <Link to="/shop" className="text-sm font-semibold text-brand-deep hover:underline">All products</Link>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {categories.map((c) => (
          <Link key={c._id} to={`/shop?category=${c.slug}`} className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-center transition-colors hover:border-brand-deep md:p-4">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-brand-soft text-brand-deep transition-colors group-hover:bg-brand-deep group-hover:text-white md:h-14 md:w-14">
              {c.image?.url ? <img src={imageUrl(c.image.url, 120)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <CategoryIcon name={c.icon} size={24} strokeWidth={1.5} />}
            </span>
            <span className="text-xs font-bold leading-4 md:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
