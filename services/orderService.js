import { Cart, Coupon, Currency, Inventory, Order, Product, ShippingZone } from '../models/index.js'
import { ProductVariant } from '../models/index.js'
import { conflict, forbidden, notFound, unprocessable } from '../utils/AppError.js'
import { makeOrderNumber } from '../utils/helpers.js'
import { withTransaction } from '../config/transaction.js'
import { env } from '../config/env.js'
import { changeStock } from './inventoryService.js'
import { computeTotals } from './pricing.js'
import { convertFromBase, currencySnapshot } from './currency.js'
import { findZone } from './zones.js'
import { canTransition, customerCanCancel, restocksOnCancel } from './orderStatus.js'
import { emails } from './emailService.js'
import { notifyAdmins } from './auditService.js'

// Turns the cart items a browser sent into priced lines using ONLY database values.
export async function resolveLines(items) {
  const products = await Product.find({ _id: { $in: items.map((i) => i.product) }, status: 'active' }).lean()
  const pmap = new Map(products.map((p) => [String(p._id), p]))
  const vIds = items.filter((i) => i.variant).map((i) => i.variant)
  const variants = vIds.length ? await ProductVariant.find({ _id: { $in: vIds }, isActive: true }).lean() : []
  const vmap = new Map(variants.map((v) => [String(v._id), v]))

  const merged = new Map()
  for (const it of items) {
    const p = pmap.get(String(it.product))
    if (!p) throw unprocessable('A product in your cart is no longer available.')
    let v = null
    if (p.hasVariants) {
      v = vmap.get(String(it.variant))
      if (!v || String(v.product) !== String(p._id)) throw unprocessable(`Please choose an available option for ${p.name}.`)
    } else if (it.variant) throw unprocessable(`Invalid option selected for ${p.name}.`)
    const sku = v ? v.sku : p.sku
    const unit = v?.price ?? p.price
    // a colour is only accepted if the product really offers it
    const color = v?.color || ((p.colors || []).some((c) => c.name === it.color) ? it.color : undefined)
    const key = `${sku}|${color || ''}`
    const prev = merged.get(key)
    const quantity = (prev?.quantity || 0) + it.quantity
    if (quantity > 10) throw unprocessable(`You can order at most 10 of ${p.name}.`)
    merged.set(key, { productId: p._id, categoryId: p.category, variantId: v?._id, sku, name: p.name, image: p.images?.[0]?.url, color, model: v?.model, unitPrice: unit, quantity, lineTotal: unit * quantity })
  }
  return [...merged.values()].sort((a, b) => a.sku.localeCompare(b.sku) || String(a.color).localeCompare(String(b.color))) // stable order avoids lock contention
}

async function loadCurrency(code) {
  const wanted = (code || env.defaultCurrency).toUpperCase()
  const c = await Currency.findOne({ code: wanted, isActive: true }).lean()
  if (c) return c
  const base = await Currency.findOne({ isBase: true }).lean()
  if (!base) throw unprocessable('Store currency is not configured yet.')
  if (code && code.toUpperCase() !== base.code) throw unprocessable(`${code} is not available for checkout.`)
  return base
}

async function loadCoupon(code, userId) {
  if (!code) return { coupon: null, userUses: 0 }
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).lean()
  if (!coupon) throw unprocessable('This coupon is not valid.')
  const userUses = userId ? await Order.countDocuments({ user: userId, couponCode: coupon.code, status: { $nin: ['Cancelled', 'Returned'] } }) : 0
  return { coupon, userUses }
}

export async function quote(user, body) {
  const lines = await resolveLines(body.items)
  const zones = await ShippingZone.find({ isActive: true }).lean()
  const { country, city } = body.shippingAddress
  const zone = findZone(zones, country, city)
  const currency = await loadCurrency(body.currency)

  const stock = await Inventory.find({ sku: { $in: lines.map((l) => l.sku) } }).select('sku quantity').lean()
  const have = Object.fromEntries(stock.map((s) => [s.sku, s.quantity]))
  const issues = lines.filter((l) => (have[l.sku] ?? 0) < l.quantity).map((l) => `${l.name}: only ${have[l.sku] ?? 0} in stock`)

  if (!zone) return { deliverable: false, message: 'We do not deliver to this destination yet.', issues }
  const { coupon, userUses } = await loadCoupon(body.couponCode, user?._id)
  const totals = computeTotals({ lines, coupon, userUses, zone, method: body.deliveryMethod })
  const display = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, convertFromBase(v, currency)]))
  return {
    deliverable: true, cod: { available: zone.codAvailable, message: zone.codAvailable ? null : 'Cash on Delivery is not available for this destination, so checkout is unavailable.' },
    zone: { name: zone.name, eta: zone.eta, expressAvailable: zone.expressFee != null }, currency: currencySnapshot(currency),
    lines: lines.map(({ productId, variantId, categoryId, ...l }) => ({ ...l, product: productId, variant: variantId })), totals, display, issues,
  }
}

export async function placeOrder(user, body) {
  const lines = await resolveLines(body.items)
  const zones = await ShippingZone.find({ isActive: true }).lean()
  const zone = findZone(zones, body.shippingAddress.country, body.shippingAddress.city)
  if (!zone) throw unprocessable('We do not deliver to this destination yet, so this order cannot be placed.')
  if (!zone.codAvailable) throw unprocessable('Cash on Delivery is not available for this destination, so checkout is unavailable.')
  const currency = await loadCurrency(body.currency)
  const { coupon, userUses } = await loadCoupon(body.couponCode, user._id)
  const totals = computeTotals({ lines, coupon, userUses, zone, method: body.deliveryMethod })
  const snap = currencySnapshot(currency)

  for (let attempt = 0; ; attempt++) {
    try {
      const order = await withTransaction(async (session) => {
        const number = makeOrderNumber()
        for (const l of lines) await changeStock({ sku: l.sku, delta: -l.quantity, type: 'sale', reason: 'Order placed', reference: number, session })
        if (coupon) {
          const upd = await Coupon.findOneAndUpdate({ _id: coupon._id, active: true, $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] }, { $inc: { usedCount: 1 } }, { session })
          if (!upd) throw conflict('This coupon has just reached its usage limit.')
        }
        for (const l of lines) await Product.updateOne({ _id: l.productId }, { $inc: { soldCount: l.quantity } }, { session })
        const [created] = await Order.create([{
          number, user: user._id, customer: { name: user.name, email: user.email, phone: body.shippingAddress.phone },
          items: lines.map((l) => ({ product: l.productId, variant: l.variantId, sku: l.sku, name: l.name, image: l.image, color: l.color, model: l.model, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.lineTotal })),
          shippingAddress: body.shippingAddress, delivery: { zone: zone.name, method: body.deliveryMethod, eta: zone.eta },
          currency: snap, subtotal: totals.subtotal, discount: totals.discount, couponCode: coupon?.code, shippingFee: totals.shipping,
          total: totals.total, totalDisplay: convertFromBase(totals.total, currency),
          payment: { method: 'COD', status: 'unpaid' }, status: 'Pending', statusHistory: [{ status: 'Pending', by: 'customer' }],
        }], { session })
        await Cart.deleteOne({ user: user._id }, { session })
        return created
      })
      emails.orderConfirmation(order)
      notifyAdmins('order', `New order ${order.number} from ${order.customer.name}`, '/admin/orders')
      return order
    } catch (e) {
      if (e.code === 11000 && /number/.test(JSON.stringify(e.keyPattern || {})) && attempt < 2) continue
      throw e
    }
  }
}

export async function cancelOrder(order, who, { byCustomer = false } = {}) {
  if (byCustomer && !customerCanCancel(order.status)) throw forbidden('This order can no longer be cancelled online. Please contact support.')
  if (!canTransition(order.status, 'Cancelled')) throw conflict(`An order that is ${order.status.toLowerCase()} cannot be cancelled.`)
  const from = order.status
  return withTransaction(async (session) => {
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: from }, { status: 'Cancelled', $push: { statusHistory: { status: 'Cancelled', by: who } } }, { new: true, session })
    if (!updated) throw conflict('This order was just updated. Refresh and try again.')
    if (restocksOnCancel(from)) {
      for (const it of [...updated.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
        await changeStock({ sku: it.sku, delta: it.quantity, type: 'cancel_restore', reason: 'Order cancelled', reference: updated.number, session })
        await Product.updateOne({ _id: it.product }, { $inc: { soldCount: -it.quantity } }, { session })
      }
      if (updated.couponCode) await Coupon.updateOne({ code: updated.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session })
    }
    return updated
  })
}

export async function changeStatus(order, to, who) {
  if (to === 'Cancelled') { const o = await cancelOrder(order, who); emails.orderStatus(o); return o }
  if (!canTransition(order.status, to)) throw unprocessable(`Cannot change an order from ${order.status} to ${to}.`)
  const set = { status: to }
  if (to === 'Delivered') { set['payment.status'] = 'paid'; set.deliveredAt = new Date() }
  if (to === 'Returned' && order.payment.status === 'paid') set['refund.status'] = 'pending'
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: set, $push: { statusHistory: { status: to, by: who } } }, { new: true })
  if (!updated) throw conflict('This order was just updated. Refresh and try again.')
  if (['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Returned'].includes(to)) emails.orderStatus(updated)
  return updated
}

export async function requestReturn(order, reason) {
  if (order.status !== 'Delivered') throw forbidden('Only delivered orders can be returned.')
  if (order.returnRequest?.status) throw conflict('A return was already requested for this order.')
  if (Date.now() - new Date(order.deliveredAt || order.updatedAt).getTime() > 7 * 86400000) throw forbidden('The 7-day return window has passed.')
  order.returnRequest = { status: 'requested', reason, at: new Date() }
  await order.save()
  notifyAdmins('return', `Return requested for ${order.number}`, '/admin/orders')
  return order
}

export async function findOwnedOrder(userId, number) {
  const order = await Order.findOne({ number, user: userId })
  if (!order) throw notFound('Order not found')
  return order
}
