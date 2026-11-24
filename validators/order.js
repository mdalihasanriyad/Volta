import { z } from 'zod'
import { country, objectId, phone } from './common.js'

const item = z.object({ product: objectId, variant: objectId.optional(), color: z.string().trim().max(40).optional(), quantity: z.coerce.number().int().min(1).max(10) })
export const addressSchema = z.object({ label: z.string().max(30).optional(), fullName: z.string().trim().min(2).max(80), phone, country, city: z.string().trim().min(2).max(80), line1: z.string().trim().min(5).max(200), postcode: z.string().max(12).optional(), isDefault: z.boolean().optional() })
export const cartSchema = z.object({ items: z.array(item).max(30), couponCode: z.string().trim().max(40).optional().nullable() })

const checkoutBase = { items: z.array(item).min(1).max(30), couponCode: z.string().trim().max(40).optional().nullable(), deliveryMethod: z.enum(['standard', 'express']).default('standard'), currency: z.string().length(3).toUpperCase().optional(), shippingAddress: addressSchema.pick({ fullName: true, phone: true, country: true, city: true, line1: true, postcode: true }) }
// A quote only needs the destination (country + city) so totals can be shown while the address form is still being filled in.
export const quoteSchema = z.object({ ...checkoutBase, shippingAddress: z.object({ country, city: z.string().trim().min(2).max(80) }) })
export const placeOrderSchema = z.object({ ...checkoutBase, acceptCod: z.literal(true, { errorMap: () => ({ message: 'Confirm Cash on Delivery to place the order.' }) }) })
export const returnSchema = z.object({ reason: z.string().trim().min(5).max(500) })
export const trackSchema = z.object({ email: z.string().trim().toLowerCase().email().optional(), phone: phone.optional() })
export const reviewSchema = z.object({ product: objectId, order: objectId, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(2000).optional() })
