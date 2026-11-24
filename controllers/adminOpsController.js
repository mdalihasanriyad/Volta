import { Inventory, Notification, Order, Review, StockMovement, User } from '../models/index.js'
import { asyncHandler, escapeRegex, pageResult, parsePagination } from '../utils/helpers.js'
import { notFound } from '../utils/AppError.js'
import { adminAdjust } from '../services/inventoryService.js'
import { cancelOrder, changeStatus } from '../services/orderService.js'
import { recomputeRating } from '../services/reviewService.js'
import { logActivity } from '../services/auditService.js'

// ---- Orders ----
const orderFilter = (q) => {
  const f = {}
  if (q.status) f.status = q.status
  if (q.from || q.to) f.createdAt = { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lte: new Date(q.to) }) }
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), 'i'); f.$or = [{ number: rx }, { 'customer.name': rx }, { 'customer.phone': rx }, { 'customer.email': rx }] }
  return f
}
// Spreadsheet formula injection guard: cells starting with = + - @ are prefixed with an apostrophe.
const csvCell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"` }

export const listOrders = asyncHandler(async (req, res) => {
  const filter = orderFilter(req.query)
  if (req.query.format === 'csv') {
    const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(5000).lean()
    const head = ['Order', 'Date', 'Customer', 'Phone', 'Status', 'Payment', 'Currency', 'Total (BDT)', 'Items']
    const csv = [head.map(csvCell).join(','), ...rows.map((o) => [o.number, o.createdAt.toISOString(), o.customer.name, o.customer.phone, o.status, o.payment.status, o.currency.code, o.total, o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ')].map(csvCell).join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8').setHeader('Content-Disposition', 'attachment; filename="orders.csv"')
    return res.send(csv)
  }
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 })
  const [items, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), Order.countDocuments(filter)])
  res.json(pageResult(items, total, pg))
})
export const getOrder = asyncHandler(async (req, res) => {
  const o = await Order.findById(req.params.id).lean()
  if (!o) throw notFound('Order not found')
  res.json(o)
})
const loadOrder = async (id) => { const o = await Order.findById(id); if (!o) throw notFound('Order not found'); return o }

export const setOrderStatus = asyncHandler(async (req, res) => {
  const o = await changeStatus(await loadOrder(req.params.id), req.body.status, req.admin.name)
  logActivity(req, `Changed order ${o.number} to ${o.status}`, 'order', o._id)
  res.json(o)
})
export const cancel = asyncHandler(async (req, res) => {
  const o = await cancelOrder(await loadOrder(req.params.id), req.admin.name)
  logActivity(req, `Cancelled order ${o.number}`, 'order', o._id)
  res.json(o)
})
export const updateOrder = asyncHandler(async (req, res) => {
  const o = await loadOrder(req.params.id)
  const { tracking, internalNote, refundStatus, returnDecision } = req.body
  if (tracking !== undefined) o.tracking = tracking
  if (internalNote !== undefined) o.internalNote = internalNote
  if (refundStatus) o.refund.status = refundStatus
  if (returnDecision && o.returnRequest?.status === 'requested') o.returnRequest.status = returnDecision
  await o.save()
  res.json(o)
})

// ---- Inventory ----
export const inventoryList = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
  const filter = {}
  if (req.query.low === '1') filter.$expr = { $lte: ['$quantity', '$reorderLevel'] }
  if (req.query.q) filter.sku = new RegExp(escapeRegex(String(req.query.q)), 'i')
  const superAdmin = req.admin.role === 'super_admin'
  const [items, total, valuation] = await Promise.all([
    Inventory.find(filter).select(superAdmin ? '' : '-costPrice').populate('product', 'name').sort({ quantity: 1 }).skip(pg.skip).limit(pg.limit).lean(), Inventory.countDocuments(filter),
    req.admin.role === 'super_admin' ? Inventory.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } }]) : [],
  ])
  res.json({ ...pageResult(items, total, pg), ...(req.admin.role === 'super_admin' && { valuation: valuation[0]?.value || 0 }) })
})
export const inventoryAdjust = asyncHandler(async (req, res) => {
  const body = { ...req.body }
  if (req.admin.role !== 'super_admin') delete body.costPrice // cost prices are financial data
  const inv = await adminAdjust(req.admin, body)
  logActivity(req, `${req.body.type} ${req.body.quantity} for ${req.body.sku}: ${req.body.reason}`, 'inventory', inv._id)
  res.json(req.admin.role === 'super_admin' ? inv : { ...inv.toObject?.() ?? inv, costPrice: undefined })
})
export const movements = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
  const filter = req.query.sku ? { sku: String(req.query.sku).toUpperCase() } : {}
  const [items, total] = await Promise.all([StockMovement.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), StockMovement.countDocuments(filter)])
  res.json(pageResult(items, total, pg))
})

// ---- Customers (support view) ----
export const customers = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 })
  const filter = req.query.q ? { $or: ['name', 'email', 'phone'].map((k) => ({ [k]: new RegExp(escapeRegex(String(req.query.q)), 'i') })) } : {}
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)])
  const stats = await Order.aggregate([{ $match: { user: { $in: users.map((u) => u._id) }, status: { $nin: ['Cancelled', 'Returned'] } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } }])
  const by = Object.fromEntries(stats.map((s) => [String(s._id), s]))
  res.json(pageResult(users.map((u) => ({ ...u, orders: by[String(u._id)]?.orders || 0, spent: by[String(u._id)]?.spent || 0 })), total, pg))
})
export const updateCustomer = asyncHandler(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.params.id, { status: req.body.status, ...(req.body.status === 'blocked' && { $inc: { tokenVersion: 1 } }) }, { new: true })
  if (!u) throw notFound('Customer not found')
  res.json(u)
})

// ---- Reviews ----
export const reviews = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {}
  res.json(await Review.find(filter).sort({ createdAt: -1 }).limit(200).populate('product', 'name').lean())
})
export const moderateReview = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
  if (!r) throw notFound('Review not found')
  await recomputeRating(r.product)
  res.json(r)
})

// ---- Notifications ----
export const notifications = asyncHandler(async (req, res) => {
  const list = await Notification.find().sort({ createdAt: -1 }).limit(50).lean()
  res.json(list.map((n) => ({ ...n, read: n.readBy.some((id) => String(id) === String(req.admin._id)), readBy: undefined })))
})
export const markRead = asyncHandler(async (req, res) => {
  const filter = req.params.id === 'all' ? {} : { _id: req.params.id }
  await Notification.updateMany(filter, { $addToSet: { readBy: req.admin._id } })
  res.json({ ok: true })
})
