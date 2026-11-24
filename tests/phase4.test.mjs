import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { quoteSchema, placeOrderSchema, cartSchema } from '../validators/order.js'
import { productQuerySchema, contactSchema, uploadSignSchema } from '../validators/catalog.js'
import { googleSchema } from '../validators/auth.js'
import { sign, signUpload, destroyImage } from '../services/cloudinaryService.js'
import { imageUrl, imageSrcSet } from '../src/utils/images.js'

const oid = (n = 1) => String(n).padStart(24, 'b')

test('quote only needs country and city; color is optional and bounded', () => {
  const body = { items: [{ product: oid(1), quantity: 1, color: 'Black' }], shippingAddress: { country: 'bd', city: 'Dhaka' } }
  const ok = quoteSchema.safeParse(body)
  assert.equal(ok.success, true)
  assert.equal(ok.data.shippingAddress.country, 'BD')
  assert.equal(ok.data.items[0].color, 'Black')
  assert.equal(quoteSchema.safeParse({ ...body, shippingAddress: { country: 'bd' } }).success, false)
  assert.equal(cartSchema.safeParse({ items: [{ product: oid(1), quantity: 1, color: 'x'.repeat(41) }] }).success, false)
  // placing an order still needs the full address
  assert.equal(placeOrderSchema.safeParse({ ...body, acceptCod: true }).success, false)
})

test('ids filter accepts only comma separated object ids (max 48)', () => {
  assert.equal(productQuerySchema.safeParse({ ids: `${oid(1)},${oid(2)}` }).success, true)
  assert.equal(productQuerySchema.safeParse({ ids: 'abc' }).success, false)
  assert.equal(productQuerySchema.safeParse({ ids: `${oid(1)},{"$ne":1}` }).success, false)
  assert.equal(productQuerySchema.safeParse({ ids: Array.from({ length: 49 }, (_, i) => oid(i + 1)).join(',') }).success, false)
})

test('contact, upload folder and google credential validation', () => {
  assert.equal(contactSchema.safeParse({ name: 'Ana', email: 'a@b.co', subject: 'Order help', message: 'Where is my order?' }).success, true)
  assert.equal(contactSchema.safeParse({ name: 'Ana', email: 'a@b.co', subject: 'Hi', message: 'short' }).success, false)
  assert.equal(uploadSignSchema.safeParse({ folder: 'products' }).success, true)
  assert.equal(uploadSignSchema.safeParse({ folder: '../secrets' }).success, false)
  assert.equal(googleSchema.safeParse({ credential: 'x'.repeat(30) }).success, true)
  assert.equal(googleSchema.safeParse({ credential: 'short' }).success, false)
})

test('cloudinary signature follows the documented algorithm and never leaks the secret', async () => {
  const params = { timestamp: 1700000000, folder: 'volta/products', allowed_formats: 'jpg,png' }
  const expected = crypto.createHash('sha1').update('allowed_formats=jpg,png&folder=volta/products&timestamp=1700000000' + 'topsecret').digest('hex')
  assert.equal(sign(params, 'topsecret'), expected)
  assert.throws(() => signUpload('products'), /not configured/) // no credentials in the test environment
  await assert.rejects(() => destroyImage('other/thing'), /not configured|managed by this store/)
})

test('image helpers add responsive Cloudinary transforms and leave other URLs alone', () => {
  const u = 'https://res.cloudinary.com/demo/image/upload/v1/volta/products/a.jpg'
  assert.equal(imageUrl(u, 640), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640/v1/volta/products/a.jpg')
  assert.match(imageSrcSet(u), /w_320.* 320w, .*w_640.* 640w, .*w_960.* 960w/)
  assert.equal(imageUrl('https://example.com/a.jpg', 640), 'https://example.com/a.jpg')
  assert.equal(imageSrcSet('https://example.com/a.jpg'), undefined)
  assert.equal(imageUrl(null), null)
})
