import { unprocessable } from '../utils/AppError.js'

// All amounts are whole base-currency units (BDT). Prices, discounts and shipping are always computed here on the
// server from database values; nothing a browser sends is trusted.
export function eligibleSubtotal(coupon, lines) {
  const t = coupon.appliesTo?.type || 'all'
  const ids = (coupon.appliesTo?.ids || []).map(String)
  return lines
    .filter((l) => t === 'all' || (t === 'products' && ids.includes(String(l.productId))) || (t === 'categories' && ids.includes(String(l.categoryId))))
    .reduce((n, l) => n + l.lineTotal, 0)
}

export function checkCoupon(coupon, { subtotal, eligible, userUses = 0, now = new Date() }) {
  if (!coupon || !coupon.active) return 'This coupon is not valid.'
  if (coupon.startsAt && now < coupon.startsAt) return 'This coupon is not active yet.'
  if (coupon.expiresAt && now > coupon.expiresAt) return 'This coupon has expired.'
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return 'This coupon has reached its usage limit.'
  if (coupon.perUserLimit > 0 && userUses >= coupon.perUserLimit) return 'You have already used this coupon.'
  if (eligible <= 0) return 'This coupon does not apply to the items in your cart.'
  if (subtotal < (coupon.minPurchase || 0)) return `This coupon needs a minimum order of ${coupon.minPurchase}.`
  return null
}

export function couponDiscount(coupon, eligible) {
  let d = coupon.type === 'percent' ? Math.round((eligible * coupon.value) / 100) : coupon.value
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) d = Math.min(d, coupon.maxDiscount)
  return Math.max(0, Math.min(d, eligible))
}

export function shippingFee(zone, method, amountAfterDiscount) {
  if (method === 'express') {
    if (zone.expressFee == null) throw unprocessable('Express delivery is not available for this destination.')
    return zone.expressFee
  }
  if (zone.freeThreshold > 0 && amountAfterDiscount >= zone.freeThreshold) return 0
  return zone.baseFee
}

export function computeTotals({ lines, coupon = null, userUses = 0, zone, method = 'standard', now = new Date() }) {
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0)
  let discount = 0
  if (coupon) {
    const eligible = eligibleSubtotal(coupon, lines)
    const problem = checkCoupon(coupon, { subtotal, eligible, userUses, now })
    if (problem) throw unprocessable(problem)
    discount = couponDiscount(coupon, eligible)
  }
  const shipping = shippingFee(zone, method, subtotal - discount)
  return { subtotal, discount, shipping, total: subtotal - discount + shipping }
}
