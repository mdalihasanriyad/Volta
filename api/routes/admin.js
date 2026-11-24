import { Router } from 'express'
import * as auth from '../../controllers/authController.js'
import * as cat from '../../controllers/adminCatalogController.js'
import * as ops from '../../controllers/adminOpsController.js'
import * as sup from '../../controllers/adminSuperController.js'
import { requireAdmin, requirePermission, superOnly } from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/security.js'
import { validate } from '../../middleware/validate.js'
import { logActivity } from '../../services/auditService.js'
import { changePasswordSchema } from '../../validators/auth.js'
import * as a from '../../validators/admin.js'
import * as v from '../../validators/catalog.js'

const r = Router()

// ---- Admin authentication (public endpoints) ----
r.post('/auth/login', authLimiter, validate(a.adminLoginSchema), auth.adminLogin)
r.post('/auth/logout', auth.adminLogout)
r.post('/auth/refresh', auth.adminRefresh)
r.get('/auth/session', auth.adminSession)

// ---- Everything below needs a valid, ACTIVE admin. Permissions are checked on every request. ----
r.use(requireAdmin)
r.use((req, res, next) => { // audit trail for every successful change
  if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) logActivity(req, `${req.method} ${req.baseUrl}${req.path}`, req.path.split('/')[1], req.params?.id, { fields: Object.keys(req.body || {}).filter((k) => !/password/i.test(k)) }) })
  next()
})
r.get('/auth/me', auth.adminMe)
r.patch('/auth/password', authLimiter, validate(changePasswordSchema), auth.adminChangePassword)
r.get('/dashboard', sup.getDashboard)            // revenue figures are only included for Super Admins
r.get('/lookups', cat.lookups)
r.get('/notifications', ops.notifications)
r.patch('/notifications/:id/read', ops.markRead)

// Image uploads (signed Cloudinary uploads)
const uploads = requirePermission('products', 'banners', 'categories')
r.post('/uploads/sign', uploads, validate(v.uploadSignSchema), cat.signImageUpload)
r.post('/uploads/delete', uploads, validate(v.uploadDeleteSchema), cat.deleteImage)

// Catalog
const products = requirePermission('products')
r.get('/products', products, cat.listProducts)
r.post('/products', products, validate(v.productSchema), cat.addProduct)
r.get('/products/:id', products, cat.getProduct)
r.patch('/products/:id', products, validate(v.productUpdateSchema), cat.editProduct)
r.delete('/products/:id', products, cat.removeProduct)
r.post('/products/:id/variants', products, validate(v.variantCreateSchema), cat.addVariant)
r.patch('/variants/:id', products, validate(v.variantUpdateSchema), cat.editVariant)
r.get('/brands', products, cat.brands.list)
r.post('/brands', products, validate(v.brandSchema), cat.brands.create)
r.patch('/brands/:id', products, validate(v.brandSchema.partial()), cat.brands.update)
r.delete('/brands/:id', products, cat.brands.remove)

const categories = requirePermission('categories')
r.get('/categories', categories, cat.categories.list)
r.post('/categories', categories, validate(v.categorySchema), cat.categories.create)
r.patch('/categories/:id', categories, validate(v.categorySchema.partial()), cat.categories.update)
r.delete('/categories/:id', categories, cat.categories.remove)

const banners = requirePermission('banners')
r.get('/banners', banners, cat.banners.list)
r.post('/banners', banners, validate(v.bannerSchema), cat.banners.create)
r.patch('/banners/:id', banners, validate(v.bannerSchema.partial()), cat.banners.update)
r.delete('/banners/:id', banners, cat.banners.remove)

// Inventory
const inventory = requirePermission('inventory')
r.get('/inventory', inventory, ops.inventoryList)
r.get('/inventory/movements', inventory, ops.movements)
r.post('/inventory/adjust', inventory, validate(a.stockAdjustSchema), ops.inventoryAdjust)

// Orders and customers
const orders = requirePermission('orders')
r.get('/orders', orders, validate(a.adminOrderQuerySchema, 'query'), ops.listOrders)
r.get('/orders/:id', orders, ops.getOrder)
r.patch('/orders/:id/status', orders, validate(a.orderStatusSchema), ops.setOrderStatus)
r.patch('/orders/:id', orders, validate(a.orderUpdateSchema), ops.updateOrder)
r.post('/orders/:id/cancel', orders, ops.cancel)
r.get('/customers', requirePermission('customers'), ops.customers)
r.patch('/customers/:id', requirePermission('customers'), validate(a.customerUpdateSchema), ops.updateCustomer)

// Reviews
r.get('/reviews', requirePermission('reviews'), ops.reviews)
r.patch('/reviews/:id', requirePermission('reviews'), validate(a.reviewModerationSchema), ops.moderateReview)

// ---- Super Admin only: financial reports, coupons, shipping, currency, settings/SEO/content, admin accounts, logs ----
r.use(superOnly)
r.get('/sales', validate(a.salesQuerySchema, 'query'), sup.sales)
r.get('/coupons', sup.coupons.list)
r.post('/coupons', validate(a.couponSchema), sup.coupons.create)
r.patch('/coupons/:id', validate(a.couponUpdateSchema), sup.coupons.update)
r.delete('/coupons/:id', sup.coupons.remove)
r.get('/shipping-zones', sup.zones.list)
r.post('/shipping-zones', validate(a.zoneSchema), sup.zones.create)
r.patch('/shipping-zones/:id', validate(a.zoneSchema.partial()), sup.zones.update)
r.delete('/shipping-zones/:id', sup.zones.remove)
r.get('/currencies', sup.listCurrencies)
r.post('/currencies', validate(a.currencySchema), sup.createCurrency)
r.patch('/currencies/:id', validate(a.currencySchema.partial()), sup.updateCurrency)
r.delete('/currencies/:id', sup.deleteCurrency)
r.get('/settings', sup.getSettings)
r.put('/settings', validate(a.settingsSchema), sup.updateSettings)
r.get('/admins', sup.listAdmins)
r.post('/admins', validate(a.adminCreateSchema), sup.createAdmin)
r.patch('/admins/:id', auth.guardNotSelf, validate(a.adminUpdateSchema), sup.updateAdmin)
r.get('/logs', sup.logs)
export default r
