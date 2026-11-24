import { Admin, StoreSettings, User } from '../models/index.js'
import { asyncHandler } from '../utils/helpers.js'
import { forbidden } from '../utils/AppError.js'
import * as auth from '../services/authService.js'
import { loadAdmin, loadUser } from '../middleware/auth.js'
import { logActivity } from '../services/auditService.js'

// ---- Customers ----
export const register = asyncHandler(async (req, res) => {
  const user = await auth.registerCustomer(req.body)
  auth.startSession(res, user, 'customer')
  res.status(201).json({ user: auth.publicUser(user), message: 'Account created. Check your email to verify your address.' })
})
export const login = asyncHandler(async (req, res) => {
  const user = await auth.authenticate(User, req.body.email, req.body.password, { suspendedKey: 'blocked' })
  auth.startSession(res, user, 'customer')
  res.json({ user: auth.publicUser(user) })
})
export const google = asyncHandler(async (req, res) => {
  const user = await auth.googleLogin(req.body.credential)
  auth.startSession(res, user, 'customer')
  res.json({ user: auth.publicUser(user) })
})
export const logout = (req, res) => { auth.endSession(res, 'customer'); res.json({ ok: true }) }
export const refresh = asyncHandler(async (req, res) => res.json({ user: auth.publicUser(await auth.refreshSession(req, res, 'customer')) }))
// "Who am I": answers 200 with { user: null } for visitors (no 401 in the browser console) and silently renews an expired access token.
export const me = asyncHandler(async (req, res) => {
  let user = await loadUser(req)
  if (!user) { try { user = await auth.refreshSession(req, res, 'customer') } catch { user = null } }
  res.json({ user: user ? auth.publicUser(user) : null })
})
export const verifyEmail = asyncHandler(async (req, res) => { const u = await auth.verifyEmail(req.body.token); res.json({ user: auth.publicUser(u) }) })
export const resendVerification = asyncHandler(async (req, res) => { await auth.resendVerification(req.user); res.json({ ok: true }) })
export const forgotPassword = asyncHandler(async (req, res) => { await auth.forgotPassword(req.body.email); res.json({ message: 'If an account exists for that email, a reset link is on its way.' }) })
export const resetPassword = asyncHandler(async (req, res) => { await auth.resetPassword(req.body.token, req.body.password); res.json({ message: 'Password updated. You can sign in now.' }) })
export const changePassword = asyncHandler(async (req, res) => {
  const u = await auth.changePassword(User, req.user._id, req.body.currentPassword, req.body.newPassword)
  auth.startSession(res, u, 'customer') // keep this device signed in with the new token version
  res.json({ message: 'Password changed. Other devices were signed out.' })
})
export const updateProfile = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body)
  await req.user.save()
  res.json({ user: auth.publicUser(req.user) })
})

// ---- Admins (no public registration: accounts are created by a Super Admin or the seed script) ----
export const adminLogin = asyncHandler(async (req, res) => {
  const settings = await StoreSettings.findOne({ key: 'main' }).lean()
  const admin = await auth.authenticate(Admin, req.body.email, req.body.password, { maxFailed: settings?.security?.maxFailedLogins || 5, suspendedKey: 'suspended' })
  admin.lastActiveAt = new Date()
  await admin.save()
  auth.startSession(res, admin, 'admin')
  req.admin = admin
  logActivity(req, 'Signed in', 'admin', admin._id)
  res.json({ admin: auth.publicAdmin(admin) })
})
export const adminLogout = (req, res) => { auth.endSession(res, 'admin'); res.json({ ok: true }) }
export const adminRefresh = asyncHandler(async (req, res) => {
  const settings = await StoreSettings.findOne({ key: 'main' }).lean()
  res.json({ admin: auth.publicAdmin(await auth.refreshSession(req, res, 'admin', { idleMinutes: settings?.security?.sessionMinutes })) })
})
export const adminMe = (req, res) => res.json({ admin: auth.publicAdmin(req.admin) })
export const adminSession = asyncHandler(async (req, res) => {
  let admin = await loadAdmin(req)
  if (!admin) {
    const settings = await StoreSettings.findOne({ key: 'main' }).lean()
    try { admin = await auth.refreshSession(req, res, 'admin', { idleMinutes: settings?.security?.sessionMinutes }) } catch { admin = null }
  }
  res.json({ admin: admin ? auth.publicAdmin(admin) : null })
})
export const adminChangePassword = asyncHandler(async (req, res) => {
  const a = await auth.changePassword(Admin, req.admin._id, req.body.currentPassword, req.body.newPassword)
  auth.startSession(res, a, 'admin')
  res.json({ message: 'Password changed.' })
})
export const guardNotSelf = (req, res, next) => (String(req.params.id) === String(req.admin._id) ? next(forbidden('You cannot change your own account here.')) : next())
