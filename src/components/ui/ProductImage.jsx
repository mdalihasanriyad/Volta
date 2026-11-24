import CategoryIcon from './CategoryIcon'
import { useCatalog } from '../../store/catalog'
import { imageSrcSet, imageUrl } from '../../utils/normalize'

const tints = ['from-sky-100 to-white', 'from-gray-100 to-sky-50', 'from-sky-50 to-gray-100', 'from-white to-sky-100']

// Shows the Cloudinary image (responsive, lazy) or a neutral placeholder when a product has no image yet.
export default function ProductImage({ product, category, tint = 0, className = '', eager = false }) {
  const bySlug = useCatalog((s) => s.bySlug)
  const cat = bySlug[category || product?.category]
  const src = product?.images?.[tint]?.url || product?.image
  if (src) {
    const alt = product.images?.[tint]?.alt || product.name
    return (
      <div className={`overflow-hidden bg-white ${className}`}>
        <img src={imageUrl(src, 640)} srcSet={imageSrcSet(src)} sizes="(min-width: 1024px) 25vw, 50vw" alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-contain" />
      </div>
    )
  }
  return (
    <div role="img" aria-label={product?.name || cat?.name} className={`grid place-items-center bg-gradient-to-br ${tints[tint % 4]} ${className}`}>
      <CategoryIcon name={cat?.icon} className="h-auto text-brand-deep/70" style={{ width: '34%' }} strokeWidth={1.1} />
    </div>
  )
}
