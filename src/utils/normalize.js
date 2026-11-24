import { useCatalog } from '../store/catalog'

export { imageUrl, imageSrcSet } from './images'

// Turns an API product into the shape the UI components use.
export function normalizeProduct(p) {
  const cat = useCatalog.getState().byId[p.category]
  return {
    id: p._id, hasVariants: !!p.hasVariants, slug: p.slug, sku: p.sku, name: p.name, brand: p.brandName, description: p.description,
    category: cat?.slug, categoryName: cat?.name, sub: p.subcategory,
    price: p.price, oldPrice: p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : null, discount: p.discountPercent || 0,
    stock: p.stock, rating: p.ratingAvg || 0, reviews: p.ratingCount || 0, sold: p.soldCount || 0,
    images: p.images || [], image: p.images?.[0]?.url || null,
    colors: p.colors || [], specs: p.specs || {}, featured: p.isFeatured,
    isNew: Date.now() - new Date(p.createdAt).getTime() < 30 * 86400000,
    variants: (p.variants || []).map((v) => ({ id: v._id, sku: v.sku, color: v.color, model: v.model, price: v.price, stock: v.stock })),
    related: p.related ? p.related.map(normalizeProduct) : undefined,
    reviewList: p.reviews,
    seo: p.seo,
  }
}
export const normalizeList = (items) => (items || []).map(normalizeProduct)
