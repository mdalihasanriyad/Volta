import { Order, Review } from '../models/index.js'
import { Product } from '../models/index.js'
import { conflict, forbidden } from '../utils/AppError.js'

export async function createReview(user, { product, order, rating, comment }) {
  // Verified purchase: a DELIVERED order of this customer that contains this product.
  const o = await Order.findOne({ _id: order, user: user._id, status: 'Delivered', 'items.product': product }).select('_id')
  if (!o) throw forbidden('Only customers who received this product can review it.')
  if (await Review.exists({ user: user._id, product, order })) throw conflict('You already reviewed this purchase.')
  return Review.create({ product, order, user: user._id, userName: user.name.split(' ')[0] + ' ' + (user.name.split(' ')[1]?.[0] || '').toUpperCase(), rating, comment, status: 'pending' })
}

export async function recomputeRating(productId) {
  const [agg] = await Review.aggregate([{ $match: { product: productId, status: 'approved' } }, { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }])
  await Product.updateOne({ _id: productId }, { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.count || 0 })
}
