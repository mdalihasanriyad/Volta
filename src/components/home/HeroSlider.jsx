import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { imageUrl } from '../../utils/normalize'

// Slides come from the Banners managed in the admin panel.
export default function HeroSlider({ banners }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = banners.length
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (paused || reduce || n < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % n), 6000)
    return () => clearInterval(t)
  }, [paused, reduce, n])

  if (!n) return null
  const s = banners[Math.min(i, n - 1)]
  return (
    <section aria-roledescription="carousel" aria-label="Featured offers" className="container-x pt-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-2xl bg-ink">
        {s.image?.url && <img src={imageUrl(s.image.url, 1400)} alt={s.image.alt || ''} className="absolute inset-0 h-full w-full object-cover opacity-60" fetchpriority="high" />}
        <div key={s._id} className="relative grid min-h-[260px] items-center p-6 md:min-h-[380px] md:p-12">
          <div>
            <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-white md:text-5xl">{s.title}</h1>
            {s.subtitle && <p className="mt-3 max-w-md text-sm text-gray-200 md:text-base">{s.subtitle}</p>}
            <Link to={s.link || '/shop'} className="btn-sky mt-6 px-6 py-3">{s.ctaLabel || 'Shop now'}</Link>
          </div>
        </div>
        {n > 1 && (<>
          <button type="button" aria-label="Previous slide" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 hover:bg-white md:grid"><ChevronLeft size={20} /></button>
          <button type="button" aria-label="Next slide" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 hover:bg-white md:grid"><ChevronRight size={20} /></button>
          <div className="absolute bottom-4 left-6 flex gap-2 md:left-12">
            {banners.map((x, k) => <button key={x._id} type="button" aria-label={`Go to slide ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? 'w-8 bg-brand' : 'w-2 bg-white/40'}`} />)}
          </div>
        </>)}
      </div>
    </section>
  )
}
