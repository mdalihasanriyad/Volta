import crypto from 'node:crypto'

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
export const randomToken = () => crypto.randomBytes(32).toString('hex')

export function parsePagination(query, { defaultLimit = 12, maxLimit = 48 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}
export const pageResult = (items, total, { page, limit }) => ({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) })

// Order numbers look like VLT-20418833; uniqueness is enforced by a unique index (callers retry on collision).
export function makeOrderNumber() {
  return `VLT-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`
}
