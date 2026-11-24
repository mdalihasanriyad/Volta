import { z } from 'zod'
import { ASSIGNABLE_PERMISSIONS } from '../models/Admin.js'
import { email, money, objectId, password, country } from './common.js'
import { ALL_STATUSES } from '../services/orderStatus.js'

export const adminLoginSchema = z.object({ email, password: z.string().min(1).max(100) })
export const adminCreateSchema = z.object({ name: z.string().trim().min(2).max(80), email, password, permissions: z.array(z.enum(ASSIGNABLE_PERMISSIONS)).default([]) })
export const adminUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), permissions: z.array(z.enum(ASSIGNABLE_PERMISSIONS)).optional(), status: z.enum(['active', 'suspended']).optional() })

export const orderStatusSchema = z.object({ status: z.enum(ALL_STATUSES) })
export const orderUpdateSchema = z.object({ tracking: z.string().trim().max(80).optional(), internalNote: z.string().trim().max(1000).optional(), refundStatus: z.enum(['none', 'pending', 'refunded']).optional(), returnDecision: z.enum(['approved', 'rejected']).optional() })
export const adminOrderQuerySchema = z.object({ q: z.string().max(80).optional(), status: z.enum(ALL_STATUSES).optional(), from: z.string().optional(), to: z.string().optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional(), format: z.enum(['json', 'csv']).optional() })

export const stockAdjustSchema = z.object({ sku: z.string().trim().min(2).max(40), type: z.enum(['stock_in', 'stock_out', 'adjustment']), direction: z.enum(['add', 'remove']).optional(), quantity: z.coerce.number().int().min(1).max(1000000), reason: z.string().trim().min(3).max(200), reorderLevel: z.coerce.number().int().min(0).optional(), costPrice: money.optional() })
  .refine((v) => v.type !== 'adjustment' || v.direction, { message: 'Choose add or remove for an adjustment', path: ['direction'] })

const couponBase = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/), type: z.enum(['percent', 'fixed']), value: money,
  maxDiscount: money.default(0), minPurchase: money.default(0), usageLimit: z.coerce.number().int().min(0).default(0), perUserLimit: z.coerce.number().int().min(0).default(0),
  startsAt: z.coerce.date().optional().nullable(), expiresAt: z.coerce.date().optional().nullable(),
  appliesTo: z.object({ type: z.enum(['all', 'products', 'categories']).default('all'), ids: z.array(objectId).default([]) }).default({}),
  campaign: z.string().max(80).optional(), active: z.boolean().default(true),
})
export const couponSchema = couponBase.refine((c) => c.type !== 'percent' || c.value <= 100, { message: 'A percentage cannot exceed 100', path: ['value'] })
export const couponUpdateSchema = couponBase.partial()

export const zoneSchema = z.object({ name: z.string().trim().min(2).max(80), countries: z.array(z.union([country, z.literal('*')])).min(1), regions: z.array(z.string().trim().max(80)).default([]), baseFee: money, expressFee: money.nullable().optional(), freeThreshold: money.default(0), eta: z.string().max(60).optional(), codAvailable: z.boolean().default(false), isActive: z.boolean().default(true) })
export const currencySchema = z.object({ code: z.string().trim().length(3).toUpperCase(), name: z.string().trim().min(2).max(60), symbol: z.string().trim().min(1).max(5), rate: z.coerce.number().positive('Rate must be greater than zero'), decimals: z.coerce.number().int().min(0).max(4).default(2), isActive: z.boolean().default(true), isDefault: z.boolean().optional() })
export const reviewModerationSchema = z.object({ status: z.enum(['approved', 'rejected']) })
export const customerUpdateSchema = z.object({ status: z.enum(['active', 'blocked']) })
export const salesQuerySchema = z.object({ period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily') })

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(80).optional(), email: z.string().email().optional(), phone: z.string().max(30).optional(), address: z.string().max(200).optional(),
  announcement: z.string().max(200).optional(), lowStockThreshold: z.coerce.number().int().min(0).max(1000).optional(), maintenance: z.boolean().optional(),
  homepageSections: z.array(z.object({ key: z.string().max(40), label: z.string().max(80), visible: z.boolean() })).max(30).optional(),
  seoPages: z.array(z.object({ page: z.string().max(80), path: z.string().max(200), title: z.string().max(120), description: z.string().max(300) })).max(100).optional(),
  security: z.object({ sessionMinutes: z.coerce.number().int().min(5).max(1440), maxFailedLogins: z.coerce.number().int().min(3).max(20), requireStrongPasswords: z.boolean().optional() }).optional(),
})
