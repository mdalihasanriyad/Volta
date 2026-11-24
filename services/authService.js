import bcrypt from 'bcryptjs'
import { Admin, User } from '../models/index.js'
import { AppError, forbidden, unauthorized, badRequest } from '../utils/AppError.js'
import { env } from '../config/env.js'
import { randomToken, sha256 } from '../utils/helpers.js'
import { ADMIN_COOKIES, CUSTOMER_COOKIES, clearAuthCookies, setAuthCookies, verifyRefresh } from '../utils/tokens.js'
import { emails } from './emailService.js'

const COST = 12
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST) // keeps timing similar when the account does not exist
export const hashPassword = (p) => bcrypt.hash(p, COST)
const LOCK_MINUTES = 15

// Shared by customers and admins. Returns the document or throws a deliberately vague 401.
export async function authenticate(Model, email, password, { maxFailed = 5, suspendedKey }) {
  const doc = await Model.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, doc?.passwordHash || DUMMY_HASH)
  if (doc?.lockedUntil && doc.lockedUntil > new Date()) throw forbidden('Too many failed attempts. Try again in a few minutes.')
  if (!doc || !doc.passwordHash || !ok) {
    if (doc) {
      doc.failedLogins += 1
      if (doc.failedLogins >= maxFailed) { doc.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000); doc.failedLogins = 0 }
      await doc.save()
    }
    throw unauthorized('Incorrect email or password.')
  }
  if (doc.status === suspendedKey) throw forbidden('This account has been disabled. Contact support.')
  doc.failedLogins = 0; doc.lockedUntil = undefined; doc.lastLoginAt = new Date()
  await doc.save()
  return doc
}

export async function registerCustomer({ name, email, password }) {
  if (await User.exists({ email })) throw badRequest('An account with this email already exists. Try signing in.')
  const token = randomToken()
  const user = await User.create({ name, email, passwordHash: await hashPassword(password), verifyTokenHash: sha256(token), verifyExpires: new Date(Date.now() + 24 * 3600000) })
  emails.verify(user, token)
  return user
}

export async function verifyEmail(token) {
  const user = await User.findOne({ verifyTokenHash: sha256(token), verifyExpires: { $gt: new Date() } }).select('+verifyTokenHash +verifyExpires')
  if (!user) throw badRequest('This verification link is invalid or has expired.')
  user.emailVerified = true; user.verifyTokenHash = undefined; user.verifyExpires = undefined
  await user.save()
  return user
}

export async function resendVerification(user) {
  if (user.emailVerified) return
  const token = randomToken()
  await User.updateOne({ _id: user._id }, { verifyTokenHash: sha256(token), verifyExpires: new Date(Date.now() + 24 * 3600000) })
  emails.verify(user, token)
}

// Always answers the same way so the endpoint cannot be used to discover which emails have accounts.
export async function forgotPassword(email) {
  const user = await User.findOne({ email })
  if (!user || user.status !== 'active') return
  const token = randomToken()
  await User.updateOne({ _id: user._id }, { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + 3600000) })
  emails.reset(user, token)
}

export async function resetPassword(token, password) {
  const user = await User.findOne({ resetTokenHash: sha256(token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires')
  if (!user) throw badRequest('This reset link is invalid or has expired.')
  user.passwordHash = await hashPassword(password); user.resetTokenHash = undefined; user.resetExpires = undefined
  user.tokenVersion += 1; user.emailVerified = true // proving mailbox access also verifies the address
  await user.save()
}

export async function changePassword(Model, id, current, next) {
  const doc = await Model.findById(id).select('+passwordHash')
  if (!doc || !(await bcrypt.compare(current, doc.passwordHash || DUMMY_HASH))) throw unauthorized('Your current password is incorrect.')
  doc.passwordHash = await hashPassword(next); doc.tokenVersion += 1
  await doc.save()
  return doc
}

export async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) throw new AppError(503, 'Google sign-in is not configured yet.')
  // Google validates the signature and expiry; we additionally check audience, issuer and verified email.
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
  if (!r.ok) throw unauthorized('Google sign-in failed. Please try again.')
  const p = await r.json()
  const verified = p.email_verified === true || p.email_verified === 'true'
  if (p.aud !== env.googleClientId || !['accounts.google.com', 'https://accounts.google.com'].includes(p.iss) || !verified || !p.email) throw unauthorized('Google sign-in failed. Please try again.')
  return { googleId: p.sub, email: String(p.email).toLowerCase(), name: p.name || String(p.email).split('@')[0], avatar: p.picture }
}

// Sign in with Google: finds the account by Google id, links an existing account with the same (Google-verified) email, or creates one.
export async function googleLogin(credential) {
  const g = await verifyGoogleCredential(credential)
  let user = await User.findOne({ googleId: g.googleId }) || await User.findOne({ email: g.email })
  if (!user) user = await User.create({ name: g.name, email: g.email, googleId: g.googleId, avatar: g.avatar, emailVerified: true })
  else {
    if (user.status === 'blocked') throw forbidden('This account has been disabled. Contact support.')
    user.googleId = user.googleId || g.googleId; user.avatar = user.avatar || g.avatar; user.emailVerified = true; user.lastLoginAt = new Date()
    await user.save()
  }
  return user
}

export const startSession = (res, doc, kind) => setAuthCookies(res, kind === 'admin' ? ADMIN_COOKIES : CUSTOMER_COOKIES, doc._id, doc.tokenVersion, kind === 'admin' ? 'admin' : 'customer')
export const endSession = (res, kind) => clearAuthCookies(res, kind === 'admin' ? ADMIN_COOKIES : CUSTOMER_COOKIES)

export async function refreshSession(req, res, kind, { idleMinutes } = {}) {
  const names = kind === 'admin' ? ADMIN_COOKIES : CUSTOMER_COOKIES
  const token = req.cookies?.[names.refresh]
  if (!token) throw unauthorized()
  const p = verifyRefresh(token, kind === 'admin' ? 'admin' : 'customer')
  const Model = kind === 'admin' ? Admin : User
  const doc = await Model.findById(p.sub)
  const active = kind === 'admin' ? doc?.status === 'active' : doc?.status === 'active'
  if (!doc || !active || doc.tokenVersion !== p.tv) throw unauthorized()
  if (kind === 'admin') {
    // Idle timeout: access tokens last 15 minutes and are renewed while the admin is active, so a longer gap ends the session.
    if (idleMinutes && doc.lastActiveAt && Date.now() - new Date(doc.lastActiveAt).getTime() > idleMinutes * 60000) throw unauthorized('Your admin session timed out. Please sign in again.')
    doc.lastActiveAt = new Date()
    await doc.save()
  }
  startSession(res, doc, kind)
  return doc
}

export const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar, emailVerified: u.emailVerified })
export const publicAdmin = (a) => ({ id: a._id, name: a.name, email: a.email, role: a.role, permissions: a.permissions, status: a.status })
