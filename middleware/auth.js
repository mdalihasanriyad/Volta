import { Admin, User } from '../models/index.js'
import { ADMIN_COOKIES, CUSTOMER_COOKIES, verifyAccess } from '../utils/tokens.js'
import { unauthorized, forbidden } from '../utils/AppError.js'
import { asyncHandler } from '../utils/helpers.js'

export async function loadUser(req) {
  const token = req.cookies?.[CUSTOMER_COOKIES.access]
  if (!token) return null
  let p
  try { p = verifyAccess(token, 'customer') } catch { return null }
  const user = await User.findById(p.sub)
  if (!user || user.status !== 'active' || user.tokenVersion !== p.tv) return null
  return user
}

export const optionalUser = asyncHandler(async (req, res, next) => { req.user = await loadUser(req); next() })
export const requireUser = asyncHandler(async (req, res, next) => {
  req.user = await loadUser(req)
  if (!req.user) throw unauthorized()
  next()
})
export const requireVerifiedEmail = (req, res, next) =>
  req.user?.emailVerified ? next() : next(forbidden('Please verify your email address before placing an order.'))

// Admin auth reads the admin from the database on every request, so suspensions and permission changes apply immediately.
export async function loadAdmin(req) {
  const token = req.cookies?.[ADMIN_COOKIES.access]
  if (!token) return null
  let p
  try { p = verifyAccess(token, 'admin') } catch { return null }
  const admin = await Admin.findById(p.sub)
  if (!admin || admin.status !== 'active' || admin.tokenVersion !== p.tv) return null
  return admin
}
export const requireAdmin = asyncHandler(async (req, res, next) => {
  const admin = await loadAdmin(req)
  if (!admin) throw unauthorized('Admin sign in required')
  req.admin = admin
  next()
})

export { isSuper, requirePermission, superOnly } from './rbac.js'
