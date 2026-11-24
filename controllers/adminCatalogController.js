import { Banner, Brand, Category, Inventory, Product, ProductVariant } from '../models/index.js'
import { asyncHandler, escapeRegex, pageResult, parsePagination } from '../utils/helpers.js'
import { conflict, notFound } from '../utils/AppError.js'
import { addVariantToProduct, createProduct, deleteProduct, updateProduct } from '../services/productService.js'
import { crud } from './crud.js'
import { destroyImage, signUpload } from '../services/cloudinaryService.js'

export const listProducts = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 })
  const filter = {}
  if (req.query.status) filter.status = req.query.status
  if (req.query.q) { const rx = new RegExp(escapeRegex(String(req.query.q)), 'i'); filter.$or = [{ name: rx }, { sku: rx }, { brandName: rx }] }
  const [items, total] = await Promise.all([Product.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), Product.countDocuments(filter)])
  res.json(pageResult(items, total, pg))
})
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) throw notFound('Product not found')
  const [variants, stock] = await Promise.all([ProductVariant.find({ product: product._id }).lean(), Inventory.find({ product: product._id }).lean()])
  const superAdmin = req.admin.role === 'super_admin'
  res.json({ ...product, variants, inventory: superAdmin ? stock : stock.map(({ costPrice, ...rest }) => rest) })
})
export const addProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body }
  if (req.admin.role !== 'super_admin') { // only Super Admins record cost prices
    body.costPrice = 0
    body.variants = (body.variants || []).map((v) => ({ ...v, costPrice: 0 }))
  }
  res.status(201).json(await createProduct(req.admin, body))
})
export const addVariant = asyncHandler(async (req, res) => {
  const body = { ...req.body }
  if (req.admin.role !== 'super_admin') body.costPrice = 0
  res.status(201).json(await addVariantToProduct(req.admin, req.params.id, body))
})
export const editProduct = asyncHandler(async (req, res) => res.json(await updateProduct(req.params.id, req.body)))
export const removeProduct = asyncHandler(async (req, res) => { await deleteProduct(req.params.id); res.json({ ok: true }) })
export const editVariant = asyncHandler(async (req, res) => {
  const v = await ProductVariant.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!v) throw notFound('Variant not found')
  res.json(v)
})

export const categories = crud(Category, {
  label: 'Category', sort: { parent: 1, order: 1 },
  guardRemove: async (id) => {
    if (await Category.exists({ parent: id })) throw conflict('Delete or move its subcategories first.')
    if (await Product.exists({ category: id })) throw conflict('This category still has products.')
  },
})
export const brands = crud(Brand, { label: 'Brand', sort: { name: 1 }, guardRemove: async (id) => { if (await Product.exists({ brand: id })) throw conflict('This brand still has products.') } })
export const banners = crud(Banner, { label: 'Banner', sort: { position: 1, order: 1 } })

// Light lists used by the admin product form
export const lookups = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([Category.find().sort({ order: 1 }).select('name slug parent').lean(), Brand.find().sort({ name: 1 }).select('name').lean()])
  res.json({ categories, brands })
})

export const signImageUpload = asyncHandler(async (req, res) => res.json(signUpload(req.body.folder)))
export const deleteImage = asyncHandler(async (req, res) => { await destroyImage(req.body.publicId); res.json({ ok: true }) })
