import { useEffect } from 'react'
import HeroSlider from '../components/home/HeroSlider'
import TrustStrip from '../components/home/TrustStrip'
import FeaturedCategories from '../components/home/FeaturedCategories'
import PromoBanner from '../components/home/PromoBanner'
import BrandStrip from '../components/home/BrandStrip'
import Newsletter from '../components/home/Newsletter'
import ProductRail from '../components/product/ProductRail'
import { ErrorBox, GridSkeleton } from '../components/ui/AsyncState'
import useFetch from '../hooks/useFetch'
import { api } from '../services/api'
import { useRecent } from '../store'
import { normalizeList } from '../utils/normalize'
import { applySeo, seoFor } from '../utils/seo'
import { useCatalog } from '../store/catalog'

const DEFAULT_ORDER = ['hero-banner-slider', 'featured-categories', 'featured-products', 'new-arrivals', 'best-selling-products', 'promotional-campaign-banner', 'special-offers', 'popular-brands', 'recommended-products', 'recently-viewed-products', 'newsletter-subscription']

export default function Home() {
  const seoPages = useCatalog((s) => s.settings.seoPages)
  useEffect(() => {
    const e = seoFor(seoPages, '/')
    applySeo({ title: e?.title || 'Volta – Gadgets & Electronics', description: e?.description || 'Smartphones, laptops and smart gadgets with Cash on Delivery.' })
  }, [seoPages])
  const recentIds = useRecent((s) => s.ids)
  const { data, loading, error, reload } = useFetch(() => api.get('/catalog/home').then((r) => r.data), [])
  const { data: recent } = useFetch(() => (recentIds.length ? api.get('/catalog/products', { params: { ids: recentIds.join(',') } }).then((r) => normalizeList(r.data.items)) : Promise.resolve([])), [recentIds.join(',')])

  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (loading) return <div className="container-x py-8"><GridSkeleton count={4} className="grid-cols-2 md:grid-cols-4" /></div>

  // The admin controls which sections show and in what order (Admin > Content).
  const order = data.sections?.length ? data.sections.filter((s) => s.visible).map((s) => s.key) : DEFAULT_ORDER
  const blocks = {
    'hero-banner-slider': <><HeroSlider banners={data.heroBanners} /><TrustStrip /></>,
    'featured-categories': <FeaturedCategories categories={data.categories} />,
    'featured-products': <ProductRail title="Featured products" subtitle="Hand-picked by our team" to="/shop" products={normalizeList(data.featured)} />,
    'new-arrivals': <ProductRail title="New arrivals" to="/shop?sort=newest" products={normalizeList(data.newArrivals)} />,
    'best-selling-products': <ProductRail title="Best sellers" subtitle="What most customers are buying" to="/shop?sort=best" products={normalizeList(data.bestSellers)} />,
    'special-offers': <ProductRail title="Special offers" to="/shop?discount=1" products={normalizeList(data.offers)} />,
    'promotional-campaign-banner': <PromoBanner banners={data.promoBanners} />,
    'popular-brands': <BrandStrip brands={data.brands} />,
    'recommended-products': <ProductRail title="Recommended for you" products={normalizeList(data.recommended)} />,
    'recently-viewed-products': <ProductRail title="Recently viewed" products={recent || []} />,
    'newsletter-subscription': <Newsletter />,
  }
  return <>{order.map((k) => <div key={k}>{blocks[k]}</div>)}</>
}
