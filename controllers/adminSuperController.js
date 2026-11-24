import { ActivityLog, Admin, Coupon, Currency, Order, ShippingZone, StoreSettings } from '../models/index.js'
import { asyncHandler, pageResult, parsePagination } from '../utils/helpers.js'
import { conflict, forbidden, notFound } from '../utils/AppError.js'
import { hashPassword } from '../services/authService.js'
import { dashboard, productPerformance, salesSeries } from '../services/dashboardService.js'
import { crud } from './crud.js'

export const getDashboard = asyncHandler(async (req, res) => res.json(await dashboard(req.admin, req.admin.role === 'super_admin')))
export const sales = asyncHandler(async (req, res) => {
  const [series, products] = await Promise.all([salesSeries(req.query.period), productPerformance()])
  res.json({ period: req.query.period, currency: 'BDT', series, products })
})

export const coupons = crud(Coupon, { label: 'Coupon' })
export const zones = crud(ShippingZone, { label: 'Shipping zone', sort: { name: 1 } })

// ---- Currencies: BDT is the base (rate 1). Order totals are snapshotted, so editing a rate never changes past orders. ----
export const listCurrencies = asyncHandler(async (req, res) => res.json(await Currency.find().sort({ isBase: -1, code: 1 }).lean()))
export const createCurrency = asyncHandler(async (req, res) => {
  const { isDefault, ...data } = req.body
  const c = await Currency.create({ ...data, isDefault: false })
  if (isDefault) await setDefault(c)
  res.status(201).json(c)
})
async function setDefault(c) {
  if (!c.isActive) throw conflict('A disabled currency cannot be the default.')
  await Currency.updateMany({}, { isDefault: false })
  await Currency.updateOne({ _id: c._id }, { isDefault: true })
}
export const updateCurrency = asyncHandler(async (req, res) => {
  const c = await Currency.findById(req.params.id)
  if (!c) throw notFound('Currency not found')
  const { isDefault, code, ...data } = req.body
  if (c.isBase && (data.rate !== undefined && data.rate !== 1)) throw conflict('The base currency rate is always 1.')
  if (c.isBase && data.isActive === false) throw conflict('The base currency cannot be disabled.')
  if (c.isDefault && data.isActive === false) throw conflict('Choose another default currency before disabling this one.')
  Object.assign(c, data)
  await c.save()
  if (isDefault) await setDefault(c)
  res.json(await Currency.findById(c._id))
})
export const deleteCurrency = asyncHandler(async (req, res) => {
  const c = await Currency.findById(req.params.id)
  if (!c) throw notFound('Currency not found')
  if (c.isBase || c.isDefault) throw conflict('The base or default currency cannot be deleted.')
  if (await Order.exists({ 'currency.code': c.code })) throw conflict('Orders exist in this currency. Disable it instead.')
  await c.deleteOne()
  res.json({ ok: true })
})

export const getSettings = asyncHandler(async (req, res) => res.json((await StoreSettings.findOne({ key: 'main' }).lean()) || {}))
export const updateSettings = asyncHandler(async (req, res) => res.json(await StoreSettings.findOneAndUpdate({ key: 'main' }, { $set: req.body }, { new: true, upsert: true, runValidators: true })))

// ---- Admin accounts (Super Admin only). A Super Admin account can never be created, edited or suspended through the API. ----
export const listAdmins = asyncHandler(async (req, res) => res.json(await Admin.find().sort({ role: 1, createdAt: 1 }).lean()))
export const createAdmin = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body
  const admin = await Admin.create({ ...data, role: 'admin', passwordHash: await hashPassword(password), createdBy: req.admin._id })
  res.status(201).json({ id: admin._id, name: admin.name, email: admin.email, role: admin.role, permissions: admin.permissions, status: admin.status })
})
export const updateAdmin = asyncHandler(async (req, res) => {
  const target = await Admin.findById(req.params.id)
  if (!target) throw notFound('Admin not found')
  if (target.role === 'super_admin') throw forbidden('Super Admin accounts cannot be changed here.')
  Object.assign(target, req.body)
  if (req.body.status === 'suspended') target.tokenVersion += 1 // end their sessions immediately
  await target.save()
  res.json(target)
})
export const logs = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
  const [items, total] = await Promise.all([ActivityLog.find().sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), ActivityLog.countDocuments()])
  res.json(pageResult(items, total, pg))
})
