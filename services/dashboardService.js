import { Inventory, Order, Product, User } from '../models/index.js'

const REVENUE_STATUSES = { $nin: ['Cancelled', 'Returned'] }
const FORMATS = { daily: ['%Y-%m-%d', 30], weekly: ['%G-W%V', 12 * 7], monthly: ['%Y-%m', 366], yearly: ['%Y', 366 * 5] }

export async function dashboard(admin, isSuper) {
  const [byStatus, productCount, customerCount, low, recent, totals] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Product.countDocuments(),
    User.countDocuments(),
    Inventory.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort({ quantity: 1 }).limit(10).select('sku quantity').lean(),
    Order.find().sort({ createdAt: -1 }).limit(8).select('number customer.name status total createdAt').lean(),
    isSuper ? Order.aggregate([{ $match: { status: REVENUE_STATUSES } }, { $group: { _id: null, revenue: { $sum: '$total' }, units: { $sum: { $sum: '$items.quantity' } } } }]) : [],
  ])
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]))
  const out = { orders: byStatus.reduce((n, s) => n + s.n, 0), products: productCount, customers: customerCount, pending: counts.Pending || 0, delivered: counts.Delivered || 0, cancelled: counts.Cancelled || 0, statusBreakdown: counts, lowStock: low, recentOrders: recent }
  if (isSuper) {
    out.revenue = totals[0]?.revenue || 0
    out.unitsSold = totals[0]?.units || 0
    out.bestSellers = await Product.find().sort({ soldCount: -1 }).limit(5).select('name sku soldCount').lean()
  }
  return out
}

// Super Admin only (financial). Revenue excludes cancelled and returned orders; amounts are base currency (BDT).
export async function salesSeries(period) {
  const [fmt, days] = FORMATS[period]
  return Order.aggregate([
    { $match: { status: REVENUE_STATUSES, createdAt: { $gte: new Date(Date.now() - days * 86400000) } } },
    { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt', timezone: 'Asia/Dhaka' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }, { $project: { _id: 0, label: '$_id', revenue: 1, orders: 1 } },
  ])
}

export async function productPerformance(limit = 10) {
  return Order.aggregate([
    { $match: { status: REVENUE_STATUSES } }, { $unwind: '$items' },
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { revenue: -1 } }, { $limit: limit },
  ])
}
