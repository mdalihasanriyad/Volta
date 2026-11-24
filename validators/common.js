import { z } from 'zod'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
export const money = z.coerce.number().min(0).max(100000000)
export const password = z.string().min(8, 'Use at least 8 characters').max(100).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number')
export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160)
export const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number')
export const country = z.string().trim().length(2).transform((s) => s.toUpperCase())
export const image = z.object({ url: z.string().url(), publicId: z.string().optional(), alt: z.string().max(200).optional() })
