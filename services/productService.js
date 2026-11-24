import { Brand, Category, Inventory, Order, Product, ProductVariant, StockMovement, Review } from '../models/index.js'
import { conflict, notFound } from '../utils/AppError.js'
import { escapeRegex, pageResult, parsePagination, slugify } from '../utils/helpers.js'
import { withTransaction } from '../config/transaction.js'
import { destroyImage } from './cloudinaryService.js'

const SORTS = { newest: { createdAt: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, popular: { ratingCount: -1, soldCount: -1 }, best: { soldCount: -1 } }
const PUBLIC_FIELDS = '-seo.__v -__v'

const stockLabel = (stock) => (stock <= 0 ? 'out_of_stock' : stock <= 8 ? 'low_stock' : 'in_stock')
const decorate = (p) => ({ ...p, inStock: p.stock > 0, stockStatus: stockLabel(p.stock) })

export async function listProducts(query) {
  const filter = { status: 'active' }
  if (query.category) {
    const cat = await Category.findOne({ slug: query.category, isActive: true }).lean()
    if (!cat) return pageResult([], 0, parsePagination(query))
    const children = await Category.find({ parent: cat._id }).select('_id').lean()
    filter.category = { $in: [cat._id, ...children.map((c) => c._id)] }
  }
  if (query.sub) filter.subcategory = query.sub
  const wantedIds = query.ids ? String(query.ids).split(',') : null
  if (wantedIds) filter._id = { $in: wantedIds }
  if (query.brand) filter.brandName = new RegExp(`^${escapeRegex(query.brand)}$`, 'i')
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i')
    filter.$or = [{ name: rx }, { sku: rx }, { brandName: rx }]
  }
  if (query.min !== undefined || query.max !== undefined) filter.price = { ...(query.min !== undefined && { $gte: query.min }), ...(query.max !== undefined && { $lte: query.max }) }
  if (query.stock) filter.stock = { $gt: 0 }
  if (query.discount) filter.discountPercent = { $gt: 0 }
  if (query.rating) filter.ratingAvg = { $gte: query.rating }
  if (query.featured) filter.isFeatured = true
  if (query.isNew) filter.createdAt = { $gte: new Date(Date.now() - 30 * 86400000) }

  const pg = parsePagination(query)
  const sort = SORTS[query.sort] || { createdAt: -1 }
  const [items, total] = await Promise.all([
    Product.find(filter).select(PUBLIC_FIELDS).sort(sort).skip(pg.skip).limit(pg.limit).lean(),
    Product.countDocuments(filter),
  ])
  if (wantedIds) items.sort((a, b) => wantedIds.indexOf(String(a._id)) - wantedIds.indexOf(String(b._id))) // keep the caller's order
  return pageResult(items.map(decorate), total, pg)
}

export async function suggest(q) {
  if (!q || q.length < 2) return []
  const rx = new RegExp(escapeRegex(q), 'i')
  return Product.find({ status: 'active', $or: [{ name: rx }, { sku: rx }, { brandName: rx }] }).select('name slug sku brandName price images').limit(6).lean()
}

export async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, status: 'active' }).select(PUBLIC_FIELDS).lean()
  if (!product) throw notFound('Product not found')
  const [variants, related, reviews] = await Promise.all([
    ProductVariant.find({ product: product._id, isActive: true }).lean(),
    Product.find({ status: 'active', category: product.category, _id: { $ne: product._id } }).select(PUBLIC_FIELDS).sort({ soldCount: -1 }).limit(10).lean(),
    Review.find({ product: product._id, status: 'approved' }).sort({ createdAt: -1 }).limit(20).select('userName rating comment createdAt').lean(),
  ])
  const stocks = await Inventory.find({ product: product._id }).select('sku quantity').lean()
  const bySku = Object.fromEntries(stocks.map((s) => [s.sku, s.quantity]))
  return {
    ...decorate(product),
    variants: variants.map((v) => ({ ...v, price: v.price ?? product.price, stock: bySku[v.sku] ?? 0, inStock: (bySku[v.sku] ?? 0) > 0 })),
    related: related.map(decorate), reviews,
  }
}

const derive = (data, brand) => ({
  ...(data.name && !data.slug ? {} : {}),
  discountPercent: data.compareAtPrice && data.compareAtPrice > data.price ? Math.round((1 - data.price / data.compareAtPrice) * 100) : 0,
  ...(brand ? { brandName: brand.name } : {}),
})

async function uniqueSlug(base, exceptId) {
  let slug = slugify(base), n = 1
  while (await Product.exists({ slug, ...(exceptId && { _id: { $ne: exceptId } }) })) slug = `${slugify(base)}-${++n}`
  return slug
}

export async function createProduct(admin, data) {
  if (!(await Category.exists({ _id: data.category }))) throw notFound('Category not found')
  const brand = data.brand ? await Brand.findById(data.brand) : null
  if (data.brand && !brand) throw notFound('Brand not found')
  const { variants, stock, costPrice, ...rest } = data
  const hasVariants = variants.length > 0
  const skus = [rest.sku, ...variants.map((v) => v.sku)].map((s) => s.toUpperCase())
  if (new Set(skus).size !== skus.length) throw conflict('SKUs must be unique within a product.')

  return withTransaction(async (session) => {
    const [product] = await Product.create([{ ...rest, slug: await uniqueSlug(rest.slug || rest.name), hasVariants, stock: hasVariants ? variants.reduce((n, v) => n + v.stock, 0) : stock, ...derive(rest, brand) }], { session })
    const rows = hasVariants ? variants : [{ sku: rest.sku, stock, costPrice }]
    for (const v of rows) {
      let variantId
      if (hasVariants) {
        const [pv] = await ProductVariant.create([{ product: product._id, sku: v.sku, color: v.color, model: v.model, price: v.price, name: [v.model, v.color].filter(Boolean).join(' / ') }], { session })
        variantId = pv._id
      }
      const [inv] = await Inventory.create([{ sku: v.sku, product: product._id, variant: variantId, quantity: v.stock, costPrice: v.costPrice }], { session })
      await StockMovement.create([{ sku: inv.sku, product: product._id, type: 'initial', quantity: v.stock, balanceAfter: v.stock, reason: 'Opening stock', admin: admin._id, adminName: admin.name }], { session })
    }
    return product
  })
}

// Adds a sellable variant (own SKU, price, stock) to an existing product. Converting a simple product that still has
// stock is refused, because its stock would silently become unsellable; move that stock out first.
export async function addVariantToProduct(admin, productId, data) {
  return withTransaction(async (session) => {
    const product = await Product.findById(productId).session(session)
    if (!product) throw notFound('Product not found')
    if (!product.hasVariants) {
      const own = await Inventory.findOne({ product: productId, variant: { $exists: false } }).session(session)
      if (own && own.quantity > 0) throw conflict(`This product still has ${own.quantity} units under its own SKU. Remove that stock first (Inventory), then add variants.`)
      if (own) await Inventory.deleteOne({ _id: own._id }, { session })
    }
    const sku = data.sku.toUpperCase()
    const [pv] = await ProductVariant.create([{ product: productId, sku, color: data.color, model: data.model, price: data.price, name: [data.model, data.color].filter(Boolean).join(' / ') }], { session })
    const [inv] = await Inventory.create([{ sku, product: productId, variant: pv._id, quantity: data.stock, costPrice: data.costPrice }], { session })
    await StockMovement.create([{ sku, product: productId, type: 'initial', quantity: data.stock, balanceAfter: data.stock, reason: 'Variant added', admin: admin._id, adminName: admin.name }], { session })
    await Product.updateOne({ _id: productId }, { hasVariants: true, $inc: { stock: data.stock } }, { session })
    return { variant: pv, inventory: inv }
  })
}

export async function updateProduct(id, data) {
  const product = await Product.findById(id)
  if (!product) throw notFound('Product not found')
  const brand = data.brand ? await Brand.findById(data.brand) : null
  Object.assign(product, data, derive({ price: data.price ?? product.price, compareAtPrice: data.compareAtPrice === undefined ? product.compareAtPrice : data.compareAtPrice }, brand))
  if (data.slug) product.slug = await uniqueSlug(data.slug, id)
  if (data.sku) await Inventory.updateOne({ product: id, variant: { $exists: false } }, { sku: data.sku }) // keep a simple product's stock record in step
  return product.save()
}

export async function deleteProduct(id) {
  if (await Order.exists({ 'items.product': id })) throw conflict('This product has orders. Set it to Draft instead of deleting it.')
  const product = await Product.findByIdAndDelete(id)
  if (!product) throw notFound('Product not found')
  ;(product.images || []).forEach((i) => i.publicId && destroyImage(i.publicId).catch(() => {}))
  await Promise.all([ProductVariant.deleteMany({ product: id }), Inventory.deleteMany({ product: id }), Review.deleteMany({ product: id })])
  return product
}
