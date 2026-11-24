import { Router } from 'express'
import * as c from '../../controllers/customerController.js'
import { requireUser, requireVerifiedEmail } from '../../middleware/auth.js'
import { authLimiter, orderLimiter } from '../../middleware/security.js'
import { validate } from '../../middleware/validate.js'
import { addressSchema, cartSchema, placeOrderSchema, quoteSchema, returnSchema, reviewSchema } from '../../validators/order.js'

const r = Router()
// Public: order tracking needs order number + email/phone
r.get('/orders/track/:number', authLimiter, c.track)

// Everything below requires a signed-in customer. There is no guest checkout.
r.use(['/addresses', '/cart', '/wishlist', '/checkout', '/orders', '/reviews'], requireUser)
r.get('/addresses', c.listAddresses)
r.post('/addresses', validate(addressSchema), c.createAddress)
r.patch('/addresses/:id', validate(addressSchema.partial()), c.updateAddress)
r.delete('/addresses/:id', c.deleteAddress)

r.get('/cart', c.getCart)
r.put('/cart', validate(cartSchema), c.saveCart)
r.get('/wishlist', c.getWishlist)
r.post('/wishlist/:productId', c.addWishlist)
r.delete('/wishlist/:productId', c.removeWishlist)

r.post('/checkout/quote', validate(quoteSchema), c.quote)
r.post('/orders', orderLimiter, requireVerifiedEmail, validate(placeOrderSchema), c.placeOrder)
r.get('/orders', c.myOrders)
r.get('/orders/:number', c.myOrder)
r.post('/orders/:number/cancel', c.cancelMyOrder)
r.post('/orders/:number/return', validate(returnSchema), c.returnMyOrder)

r.get('/reviews/mine', c.myReviews)
r.post('/reviews', validate(reviewSchema), c.writeReview)
export default r
