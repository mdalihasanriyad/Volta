import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ACCESS_TTL = 15 * 60
const REFRESH_TTL = 7 * 24 * 60 * 60

// aud separates customer sessions from admin sessions so one can never be used as the other.
export const signAccess = (id, tv, aud) => jwt.sign({ tv, typ: 'access' }, env.jwtSecret, { subject: String(id), audience: aud, expiresIn: ACCESS_TTL })
export const signRefresh = (id, tv, aud) => jwt.sign({ tv, typ: 'refresh' }, env.jwtRefreshSecret, { subject: String(id), audience: aud, expiresIn: REFRESH_TTL })
export const verifyAccess = (t, aud) => jwt.verify(t, env.jwtSecret, { audience: aud })
export const verifyRefresh = (t, aud) => jwt.verify(t, env.jwtRefreshSecret, { audience: aud })

const base = { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' }
export function setAuthCookies(res, names, id, tv, aud) {
  res.cookie(names.access, signAccess(id, tv, aud), { ...base, maxAge: ACCESS_TTL * 1000 })
  res.cookie(names.refresh, signRefresh(id, tv, aud), { ...base, maxAge: REFRESH_TTL * 1000 })
}
export function clearAuthCookies(res, names) {
  res.clearCookie(names.access, base)
  res.clearCookie(names.refresh, base)
}
export const CUSTOMER_COOKIES = { access: 'volta_at', refresh: 'volta_rt' }
export const ADMIN_COOKIES = { access: 'volta_admin_at', refresh: 'volta_admin_rt' }
