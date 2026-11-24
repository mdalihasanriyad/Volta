import { forbidden } from '../utils/AppError.js'

export const isSuper = (admin) => admin.role === 'super_admin'

// Super Admin passes every check. A regular Admin needs at least one of the listed permissions.
export const requirePermission = (...perms) => (req, res, next) => {
  if (isSuper(req.admin) || perms.some((p) => req.admin.permissions.includes(p))) return next()
  next(forbidden(`Your account does not have the "${perms.join('" or "')}" permission.`))
}
export const superOnly = (req, res, next) => (isSuper(req.admin) ? next() : next(forbidden('This area is for Super Admins only.')))
