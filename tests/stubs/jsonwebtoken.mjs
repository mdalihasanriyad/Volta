// Minimal JWT stand-in: signs {payload, sub, aud, exp, secret-tag} and checks audience, expiry and secret on verify.
const tag = (s) => Buffer.from(String(s)).toString('base64').slice(0, 12)
const err = (name, message) => Object.assign(new Error(message), { name })
export default {
  sign(payload, secret, opts = {}) {
    const exp = Math.floor(Date.now() / 1000) + (opts.expiresIn ?? 900)
    return Buffer.from(JSON.stringify({ ...payload, sub: opts.subject, aud: opts.audience, exp, k: tag(secret) })).toString('base64url')
  },
  verify(token, secret, opts = {}) {
    let p
    try { p = JSON.parse(Buffer.from(token, 'base64url').toString()) } catch { throw err('JsonWebTokenError', 'invalid token') }
    if (p.k !== tag(secret)) throw err('JsonWebTokenError', 'invalid signature')
    if (opts.audience && p.aud !== opts.audience) throw err('JsonWebTokenError', 'jwt audience invalid')
    if (p.exp * 1000 < Date.now()) throw err('TokenExpiredError', 'jwt expired')
    return p
  },
}
