import { Banner, Brand, Category, Currency, Newsletter, StoreSettings } from '../models/index.js'
import { asyncHandler } from '../utils/helpers.js'
import { env } from '../config/env.js'
import { notifyAdmins } from '../services/auditService.js'
import { getProductBySlug, listProducts, suggest } from '../services/productService.js'

export const products = asyncHandler(async (req, res) => res.json(await listProducts(req.query)))
export const productSuggest = asyncHandler(async (req, res) => res.json(await suggest(req.query.q)))
export const productDetail = asyncHandler(async (req, res) => res.json(await getProductBySlug(req.params.slug)))

export const categories = asyncHandler(async (req, res) => {
  const all = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).lean()
  const parents = all.filter((c) => !c.parent)
  res.json(parents.map((p) => ({ ...p, children: all.filter((c) => String(c.parent) === String(p._id)) })))
})
export const brands = asyncHandler(async (req, res) => res.json(await Brand.find({ isActive: true }).sort({ name: 1 }).lean()))
export const banners = asyncHandler(async (req, res) => res.json(await Banner.find({ isActive: true }).sort({ position: 1, order: 1 }).lean()))

export const currencies = asyncHandler(async (req, res) => {
  const list = await Currency.find({ isActive: true }).select('code name symbol rate decimals isBase isDefault').lean()
  res.json({ currencies: list, default: (list.find((c) => c.isDefault) || list.find((c) => c.isBase))?.code })
})
export const publicSettings = asyncHandler(async (req, res) => {
  const s = (await StoreSettings.findOne({ key: 'main' }).lean()) || {}
  res.json({ storeName: s.storeName, announcement: s.announcement, maintenance: !!s.maintenance, email: s.email, phone: s.phone, address: s.address, seoPages: s.seoPages || [], googleClientId: env.googleClientId || null })
})

// Everything the homepage needs in one request; section order and visibility are controlled from the admin.
export const home = asyncHandler(async (req, res) => {
  const [settings, banners, cats, brands, featured, fresh, best, offers, recommended] = await Promise.all([
    StoreSettings.findOne({ key: 'main' }).lean(),
    Banner.find({ isActive: true }).sort({ order: 1 }).lean(),
    Category.find({ isActive: true, parent: null }).sort({ order: 1 }).limit(12).lean(),
    Brand.find({ isActive: true, isPopular: true }).lean(),
    listProducts({ featured: '1', limit: 10 }), listProducts({ isNew: '1', sort: 'newest', limit: 10 }),
    listProducts({ sort: 'best', limit: 10 }), listProducts({ discount: '1', limit: 10 }), listProducts({ sort: 'popular', limit: 10 }),
  ])
  res.json({
    sections: settings?.homepageSections || [], announcement: settings?.announcement || '',
    heroBanners: banners.filter((b) => b.position === 'hero'), promoBanners: banners.filter((b) => b.position === 'promo'),
    categories: cats, brands, featured: featured.items, newArrivals: fresh.items, bestSellers: best.items, offers: offers.items, recommended: recommended.items,
  })
})

export const subscribe = asyncHandler(async (req, res) => {
  await Newsletter.updateOne({ email: req.body.email }, { $setOnInsert: { email: req.body.email } }, { upsert: true })
  res.status(201).json({ message: 'Subscribed.' })
})

export const contact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body
  await notifyAdmins('system', `Contact form from ${name} (${email}) – ${subject}: ${message.slice(0, 400)}`, '/admin/notifications')
  res.status(201).json({ message: 'Thanks! We will reply within one working day.' })
})
