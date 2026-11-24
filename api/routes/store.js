import { Router } from 'express'
import * as c from '../../controllers/storeController.js'
import { validate } from '../../middleware/validate.js'
import { contactSchema, newsletterSchema, productQuerySchema } from '../../validators/catalog.js'
import { authLimiter } from '../../middleware/security.js'

const r = Router()
r.get('/products', validate(productQuerySchema, 'query'), c.products)
r.get('/products/suggest', c.productSuggest)
r.get('/products/:slug', c.productDetail)
r.get('/categories', c.categories)
r.get('/brands', c.brands)
r.get('/banners', c.banners)
r.get('/home', c.home)
r.get('/currencies', c.currencies)
r.get('/settings', c.publicSettings)
r.post('/contact', authLimiter, validate(contactSchema), c.contact)
r.post('/newsletter', authLimiter, validate(newsletterSchema), c.subscribe)
export default r
