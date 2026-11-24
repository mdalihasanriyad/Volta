import { Link } from 'react-router-dom'
import { imageUrl } from '../../utils/normalize'

export default function PromoBanner({ banners }) {
  if (!banners.length) return null
  return (
    <section className="container-x py-6">
      <div className={`grid gap-3 ${banners.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {banners.slice(0, 2).map((b, i) => (
          <Link key={b._id} to={b.link || '/shop'} className={`relative overflow-hidden rounded-2xl p-6 transition-colors md:p-8 ${i % 2 ? 'bg-ink text-white hover:bg-brand-deep' : 'bg-brand-soft hover:bg-brand'}`}>
            {b.image?.url && <img src={imageUrl(b.image.url, 800)} alt={b.image.alt || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
            <div className="relative">
              <p className="text-2xl font-extrabold">{b.title}</p>
              {b.subtitle && <p className="mt-2 text-sm opacity-80">{b.subtitle}</p>}
              <span className="mt-3 inline-block text-sm font-bold underline">{b.ctaLabel || 'Shop now'}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
