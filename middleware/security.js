import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { forbidden } from '../utils/AppError.js'

// Remove Mongo operators ($where, $ne ...) and dotted keys from user input, strip HTML tags from strings.
function clean(v) {
  if (typeof v === 'string') return v.replace(/<[^>]*>/g, '')
  if (Array.isArray(v)) return v.map(clean)
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('$') || k.includes('.')) continue
      out[k] = clean(val)
    }
    return out
  }
  return v
}
export function sanitizeInput(req, res, next) {
  if (req.body) req.body = clean(req.body)
  if (req.query) { const q = clean({ ...req.query }); Object.keys(req.query).forEach((k) => delete req.query[k]); Object.assign(req.query, q) }
  next()
}

// CSRF defence for cookie auth: state-changing requests must come from our own origin (or have no Origin, e.g. curl/server).
export function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin) return next()
  const allowed = new Set([env.clientUrl, env.apiUrl].filter(Boolean))
  if (allowed.has(origin.replace(/\/$/, ''))) return next()
  next(forbidden('Cross-origin request blocked'))
}

const limiter = (windowMs, limit, message) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message } })
export const apiLimiter = limiter(15 * 60 * 1000, 600, 'Too many requests. Please slow down.')
export const authLimiter = limiter(15 * 60 * 1000, 30, 'Too many attempts. Please try again in a few minutes.')
export const orderLimiter = limiter(60 * 60 * 1000, 20, 'Too many orders from this connection. Please try again later.')
