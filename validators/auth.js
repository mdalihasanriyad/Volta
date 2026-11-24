import { z } from 'zod'
import { email, password, phone } from './common.js'

export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email, password })
export const loginSchema = z.object({ email, password: z.string().min(1).max(100) })
export const tokenSchema = z.object({ token: z.string().min(20).max(200) })
export const forgotSchema = z.object({ email })
export const resetSchema = z.object({ token: z.string().min(20).max(200), password })
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password })
export const profileSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), phone: phone.optional() })
export const googleSchema = z.object({ credential: z.string().min(20).max(4000) })
