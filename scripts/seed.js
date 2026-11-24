// Usage: npm run seed   (needs MONGODB_URI, JWT secrets and SEED_SUPER_* in .env)
// Safe to re-run: existing records are skipped. Sample catalog data comes from the same mock file the UI used in Phase 1.
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { Admin, Banner, Brand, Category, Coupon, Currency, Product, ShippingZone, StoreSettings } from '../models/index.js'
import { hashPassword } from '../services/authService.js'
import { createProduct } from '../services/productService.js'
import { brands as mockBrands, categories as mockCategories, coupons as mockCoupons, products as mockProducts, slugify } from './seedData.js'

const e = process.env
await connectDB()

// 1) First Super Admin (admin accounts can never be created publicly)
const email = (e.SEED_SUPER_EMAIL || '').trim().toLowerCase()
if (!email || !e.SEED_SUPER_PASSWORD || !e.SEED_SUPER_NAME) throw new Error('Set SEED_SUPER_NAME, SEED_SUPER_EMAIL and SEED_SUPER_PASSWORD in .env')
if (e.SEED_SUPER_PASSWORD.length < 10 || !/\d/.test(e.SEED_SUPER_PASSWORD) || !/[A-Za-z]/.test(e.SEED_SUPER_PASSWORD)) throw new Error('SEED_SUPER_PASSWORD must be 10+ characters with letters and numbers')
let superAdmin = await Admin.findOne({ email })
if (!superAdmin) {
  superAdmin = await Admin.create({ name: e.SEED_SUPER_NAME, email, role: 'super_admin', passwordHash: await hashPassword(e.SEED_SUPER_PASSWORD) })
  console.log('Created Super Admin', email)
}

// 2) Currencies. BDT is the base. USD is only added when YOU supply the rate: rates are never guessed.
await Currency.updateOne({ code: 'BDT' }, { $setOnInsert: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 1, decimals: 0, isBase: true, isDefault: true, isActive: true } }, { upsert: true })
const usd = Number(e.SEED_USD_RATE)
if (usd > 0) await Currency.updateOne({ code: 'USD' }, { $setOnInsert: { code: 'USD', name: 'US Dollar', symbol: '$', rate: usd, decimals: 2, isActive: true } }, { upsert: true })
else console.log('USD not added (SEED_USD_RATE empty). Add it in Admin > Currency with a rate you trust.')

// 3) Starter shipping zones. Review fees, thresholds and COD availability in Admin > Shipping.
if (!(await ShippingZone.countDocuments())) {
  await ShippingZone.create([
    { name: 'Dhaka City', countries: ['BD'], regions: ['Dhaka'], baseFee: 80, expressFee: 160, freeThreshold: 5000, eta: '1–2 days', codAvailable: true },
    { name: 'Outside Dhaka', countries: ['BD'], regions: [], baseFee: 130, expressFee: 250, freeThreshold: 8000, eta: '2–4 days', codAvailable: true },
    { name: 'International', countries: ['*'], regions: [], baseFee: 4800, freeThreshold: 0, eta: '10–20 days', codAvailable: false },
  ])
}

// 4) Store settings
await StoreSettings.updateOne({ key: 'main' }, { $setOnInsert: {
  key: 'main', storeName: 'Volta', email: 'support@volta.example', phone: '09600-000000', address: 'Dhanmondi, Dhaka', announcement: 'Cash on Delivery across Bangladesh. Free standard delivery over ৳5,000.',
  homepageSections: ['Hero banner slider', 'Featured categories', 'Featured products', 'New arrivals', 'Best-selling products', 'Special offers', 'Promotional campaign banner', 'Popular brands', 'Recommended products', 'Recently viewed products', 'Newsletter subscription'].map((label) => ({ key: slugify(label), label, visible: true })),
  seoPages: [{ page: 'Home', path: '/', title: 'Volta – Gadgets & Electronics', description: 'Smartphones, laptops and smart gadgets with Cash on Delivery across Bangladesh.' }],
} }, { upsert: true })

// 4b) Starter banners (text only). Upload real banner images in Admin > Banners.
if (!(await Banner.countDocuments())) {
  await Banner.create([
    { title: 'Flagship phones, delivered to your door', subtitle: 'Genuine devices with warranty. Pay when they arrive.', position: 'hero', ctaLabel: 'Shop smartphones', link: '/shop?category=smartphones', order: 1 },
    { title: 'Build a faster desk setup', subtitle: 'Monitors, keyboards and components for work and play.', position: 'hero', ctaLabel: 'Browse components', link: '/shop?category=components', order: 2 },
    { title: 'Laptops for work, class and play', subtitle: 'Compare ultrabooks, student and gaming models.', position: 'promo', ctaLabel: 'Shop laptops', link: '/shop?category=laptops', order: 1 },
    { title: 'Chargers, cables and cases', subtitle: 'Keep every device running.', position: 'promo', ctaLabel: 'Shop accessories', link: '/shop?category=mobile-accessories', order: 2 },
  ])
}

// 5) Sample catalog (skipped when products already exist)
if (!(await Product.countDocuments())) {
  const catId = {}
  for (const [i, c] of mockCategories.entries()) {
    const parent = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: { name: c.name, slug: c.slug, icon: c.icon, order: i + 1 } }, { upsert: true, new: true })
    catId[c.slug] = parent._id
    for (const [k, s] of c.subs.entries()) await Category.updateOne({ slug: `${c.slug}-${slugify(s)}` }, { $setOnInsert: { name: s, slug: `${c.slug}-${slugify(s)}`, parent: parent._id, order: k + 1 } }, { upsert: true })
  }
  const brandId = {}
  for (const b of mockBrands) brandId[b] = (await Brand.findOneAndUpdate({ name: b }, { $setOnInsert: { name: b, slug: slugify(b), isPopular: true } }, { upsert: true, new: true }))._id

  for (const p of mockProducts) {
    const cost = Math.round(p.price * 0.78)
    const per = p.models ? Math.floor(p.stock / p.models.length) : 0
    const doc = await createProduct(superAdmin, {
      name: p.name, sku: p.sku, brand: brandId[p.brand], category: catId[p.category], subcategory: p.sub, description: p.description, images: [],
      price: p.price, compareAtPrice: p.oldPrice || null, status: 'active', isFeatured: p.featured, colors: p.colors, specs: p.specs, stock: p.stock, costPrice: cost,
      variants: p.models ? p.models.map((m, k) => ({ sku: `${p.sku}-${k + 1}`, model: m.name, price: p.price + m.delta, stock: k === 0 ? p.stock - per * (p.models.length - 1) : per, costPrice: cost + m.delta })) : [],
    })
    await Product.updateOne({ _id: doc._id }, { soldCount: p.sold, ratingAvg: p.rating, ratingCount: p.reviews }) // sample popularity data
  }
  console.log(`Seeded ${mockProducts.length} sample products`)
}

for (const [code, c] of Object.entries(mockCoupons)) {
  await Coupon.updateOne({ code }, { $setOnInsert: { code, type: c.type, value: c.value, minPurchase: c.min, usageLimit: 0 } }, { upsert: true })
}
console.log('Seed complete.')
await mongoose.disconnect()
