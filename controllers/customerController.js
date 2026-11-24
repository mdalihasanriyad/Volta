import { Address, Cart, Order, Product, Review, Wishlist } from '../models/index.js'
import { asyncHandler, pageResult, parsePagination } from '../utils/helpers.js'
import { notFound } from '../utils/AppError.js'
import * as orders from '../services/orderService.js'
import { createReview } from '../services/reviewService.js'

// ---- Addresses ----
export const listAddresses = asyncHandler(async (req, res) => res.json(await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 }).lean()))
export const createAddress = asyncHandler(async (req, res) => {
  const count = await Address.countDocuments({ user: req.user._id })
  if (count >= 10) return res.status(400).json({ message: 'You can save up to 10 addresses.' })
  const isDefault = req.body.isDefault || count === 0
  if (isDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })
  res.status(201).json(await Address.create({ ...req.body, isDefault, user: req.user._id }))
})
export const updateAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) await Address.updateMany({ user: req.user._id }, { isDefault: false })
  const a = await Address.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true })
  if (!a) throw notFound('Address not found')
  res.json(a)
})
export const deleteAddress = asyncHandler(async (req, res) => {
  if (!(await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id }))) throw notFound('Address not found')
  res.json({ ok: true })
})

// ---- Cart (persisted for signed-in customers; prices are always re-read from the database) ----
const cartView = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name slug sku price images stock status category').populate('items.variant', 'sku color model price').lean()
  return { items: (cart?.items || []).filter((i) => i.product?.status === 'active'), couponCode: cart?.couponCode || null }
}
export const getCart = asyncHandler(async (req, res) => res.json(await cartView(req.user._id)))
export const saveCart = asyncHandler(async (req, res) => {
  if (req.body.items.length) await orders.resolveLines(req.body.items) // rejects unknown/inactive products and bad variants
  await Cart.updateOne({ user: req.user._id }, { items: req.body.items, couponCode: req.body.couponCode || undefined }, { upsert: true })
  res.json(await cartView(req.user._id))
})

// ---- Wishlist ----
const wishView = async (userId) => (await Wishlist.findOne({ user: userId }).populate({ path: 'products', match: { status: 'active' }, select: 'name slug sku price compareAtPrice images stock discountPercent ratingAvg ratingCount brandName' }).lean())?.products || []
export const getWishlist = asyncHandler(async (req, res) => res.json(await wishView(req.user._id)))
export const addWishlist = asyncHandler(async (req, res) => {
  if (!(await Product.exists({ _id: req.params.productId, status: 'active' }))) throw notFound('Product not found')
  await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: req.params.productId } }, { upsert: true })
  res.json(await wishView(req.user._id))
})
export const removeWishlist = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.params.productId } })
  res.json(await wishView(req.user._id))
})

// ---- Checkout and orders ----
export const quote = asyncHandler(async (req, res) => res.json(await orders.quote(req.user, req.body)))
export const placeOrder = asyncHandler(async (req, res) => {
  const o = await orders.placeOrder(req.user, req.body)
  res.status(201).json({ number: o.number, status: o.status, total: o.total, totalDisplay: o.totalDisplay, currency: o.currency, payment: o.payment })
})
export const myOrders = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 10, maxLimit: 30 })
  const [items, total] = await Promise.all([
    Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('-internalNote -user').lean(),
    Order.countDocuments({ user: req.user._id }),
  ])
  res.json(pageResult(items, total, pg))
})
export const myOrder = asyncHandler(async (req, res) => {
  const o = await Order.findOne({ number: req.params.number, user: req.user._id }).select('-internalNote -user').lean()
  if (!o) throw notFound('Order not found')
  res.json(o)
})
export const cancelMyOrder = asyncHandler(async (req, res) => {
  const o = await orders.findOwnedOrder(req.user._id, req.params.number)
  res.json(await orders.cancelOrder(o, 'customer', { byCustomer: true }))
})
export const returnMyOrder = asyncHandler(async (req, res) => {
  const o = await orders.findOwnedOrder(req.user._id, req.params.number)
  res.json(await orders.requestReturn(o, req.body.reason))
})

// Public tracking: needs the order number AND the email or phone used on the order.
export const track = asyncHandler(async (req, res) => {
  const { email, phone } = req.query
  const o = await Order.findOne({ number: req.params.number }).select('number status statusHistory tracking delivery items.name items.quantity createdAt customer.email customer.phone').lean()
  const ok = o && ((email && o.customer.email === String(email).toLowerCase()) || (phone && o.customer.phone === phone))
  if (!ok) throw notFound('We could not find an order matching those details.')
  const { customer, ...safe } = o
  res.json(safe)
})

export const writeReview = asyncHandler(async (req, res) => {
  await createReview(req.user, req.body)
  res.status(201).json({ message: 'Thanks! Your review will appear after moderation.' })
})
export const myReviews = asyncHandler(async (req, res) => res.json(await Review.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('product', 'name slug').lean()))
