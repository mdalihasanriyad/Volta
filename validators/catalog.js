import { z } from 'zod'
import { image, money, objectId } from './common.js'

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes')

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), category: z.string().max(80).optional(), sub: z.string().max(80).optional(),
  brand: z.string().max(80).optional(), min: z.coerce.number().min(0).optional(), max: z.coerce.number().min(0).optional(),
  stock: z.enum(['1']).optional(), discount: z.enum(['1']).optional(), rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popular', 'best']).optional(),
  featured: z.enum(['1']).optional(), isNew: z.enum(['1']).optional(),
  ids: z.string().regex(/^[a-f\d]{24}(,[a-f\d]{24}){0,47}$/i, 'Invalid ids').optional(),
  page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(48).optional(),
}).passthrough()

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200), slug: slug.optional(), sku: z.string().trim().min(2).max(40),
  brand: objectId.optional(), category: objectId, subcategory: z.string().trim().max(80).optional(),
  description: z.string().max(10000).optional(), images: z.array(image).max(10).default([]),
  price: money, compareAtPrice: money.optional().nullable(), status: z.enum(['active', 'draft']).default('draft'),
  isFeatured: z.boolean().default(false),
  colors: z.array(z.object({ name: z.string().max(40), hex: z.string().max(9) })).max(12).default([]),
  specs: z.record(z.string().max(200)).default({}),
  seo: z.object({ title: z.string().max(120).optional(), description: z.string().max(300).optional() }).optional(),
  // Only used when creating: opening stock for the product's own SKU, or per variant.
  stock: z.coerce.number().int().min(0).max(1000000).default(0), costPrice: money.default(0),
  variants: z.array(z.object({ sku: z.string().trim().min(2).max(40), color: z.string().max(40).optional(), model: z.string().max(60).optional(), price: money.optional(), stock: z.coerce.number().int().min(0).max(1000000).default(0), costPrice: money.default(0) })).max(30).default([]),
})
export const productUpdateSchema = productSchema.omit({ stock: true, costPrice: true, variants: true }).partial()
export const variantCreateSchema = z.object({ sku: z.string().trim().min(2).max(40), color: z.string().trim().max(40).optional(), model: z.string().trim().max(60).optional(), price: money.optional(), stock: z.coerce.number().int().min(0).max(1000000).default(0), costPrice: money.default(0) }).refine((v) => v.color || v.model, { message: 'Give the variant a model or a color', path: ['model'] })
export const variantUpdateSchema = z.object({ price: money.optional().nullable(), isActive: z.boolean().optional(), color: z.string().max(40).optional(), model: z.string().max(60).optional() })

export const categorySchema = z.object({ name: z.string().trim().min(2).max(80), slug, parent: objectId.nullable().optional(), order: z.coerce.number().int().min(0).default(0), icon: z.string().max(40).optional(), image: image.optional(), isActive: z.boolean().default(true), seo: z.object({ title: z.string().max(120).optional(), description: z.string().max(300).optional() }).optional() })
export const brandSchema = z.object({ name: z.string().trim().min(1).max(80), slug, logo: image.optional(), isPopular: z.boolean().default(false), isActive: z.boolean().default(true) })
export const bannerSchema = z.object({ title: z.string().trim().min(2).max(160), subtitle: z.string().max(300).optional(), position: z.enum(['hero', 'promo']).default('hero'), image: image.optional(), ctaLabel: z.string().max(40).optional(), link: z.string().max(300).default('/shop'), order: z.coerce.number().int().min(0).default(0), isActive: z.boolean().default(true) })
export const newsletterSchema = z.object({ email: z.string().trim().toLowerCase().email().max(160) })

export const contactSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(160), subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10).max(2000) })
export const uploadSignSchema = z.object({ folder: z.enum(['products', 'categories', 'brands', 'banners']) })
export const uploadDeleteSchema = z.object({ publicId: z.string().min(3).max(200) })
