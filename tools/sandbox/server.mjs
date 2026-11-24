// Offline end-to-end sandbox: serves the built app and runs the REAL API route tables, middleware, controllers and services
// over HTTP against the in-memory database (tools/sandbox/fakeDb.mjs). Start with:  node --import ./tests/helpers/register.mjs tools/sandbox/server.mjs
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.SANDBOX_PORT) || 4173
process.env.CLIENT_URL = `http://localhost:${PORT}`
Object.assign(process.env, { SEED_SUPER_NAME: 'Super Admin', SEED_SUPER_EMAIL: 'super@volta.test', SEED_SUPER_PASSWORD: 'SuperPass123', SEED_USD_RATE: '0.0082' })

const { createFakeDb } = await import('./fakeDb.mjs')
const db = createFakeDb()
const { default: routes } = await import('../../api/routes/index.js')
const { dispatch } = await import('../../tests/stubs/express.mjs')
const { errorHandler } = await import('../../middleware/errorHandler.js')
const { sanitizeInput, originGuard } = await import('../../middleware/security.js')
const { sitemap, robots } = await import('../../controllers/seoController.js')
const M = await import('../../models/index.js')
const { hashPassword } = await import('../../services/authService.js')

// ---- capture "emails" (printed instead of sent when no Resend key is configured) ----
const emails = []
const realLog = console.log
console.log = (...a) => {
  const s = String(a[0] ?? '')
  if (s.startsWith('[email not sent')) { const to = /to: (.*)/.exec(s)?.[1]; const subject = /subject: (.*)/.exec(s)?.[1]; const link = s.split('\n').pop().trim(); emails.push({ to, subject, link, at: Date.now() }) } else realLog(...a)
}

let runs = 0
async function seed() {
  db.reset()
  await import(`../../scripts/seed.js?run=${++runs}`)
  await M.Admin.create({ name: 'Nadia Rahman', email: 'nadia@volta.test', role: 'admin', permissions: ['orders', 'customers', 'products', 'inventory'], passwordHash: await hashPassword('NadiaPass123') })
  await M.Admin.create({ name: 'Imran Hossain', email: 'imran@volta.test', role: 'admin', permissions: ['orders'], passwordHash: await hashPassword('ImranPass123') })
  const ana = await M.User.create({ name: 'Ana Rahman', email: 'ana@example.test', emailVerified: true, passwordHash: await hashPassword('Passw0rd1') })
  await M.Address.create({ user: ana._id, label: 'Home', fullName: 'Ana Rahman', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'House 12, Road 5, Dhanmondi', isDefault: true })
  emails.length = 0
}
await seed()

const parseCookies = (h = '') => Object.fromEntries(h.split(';').map((c) => c.trim()).filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))] }))
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.map': 'application/json' }

async function api(req, resp, url, rawBody) {
  const cookies = []
  const res = {
    statusCode: 200, headers: {}, body: undefined, sent: false, finishCbs: [], on(ev, cb) { if (ev === 'finish') res.finishCbs.push(cb) },
    status(c) { res.statusCode = c; return res }, set(k, v) { res.headers[k] = v; return res }, setHeader(k, v) { res.headers[k] = v; return res },
    type(t) { res.headers['Content-Type'] = t.includes('/') ? t : `application/${t}`; return res },
    json(b) { res.headers['Content-Type'] = 'application/json'; res.body = JSON.stringify(b); res.sent = true; return res },
    send(b) { res.body = b; res.sent = true; return res },
    cookie(n, v, o = {}) { cookies.push(`${n}=${encodeURIComponent(v)}; Path=${o.path || '/'}${o.httpOnly ? '; HttpOnly' : ''}; SameSite=${o.sameSite || 'Lax'}${o.maxAge ? `; Max-Age=${Math.floor(o.maxAge / 1000)}` : ''}${o.secure ? '; Secure' : ''}`); return res },
    clearCookie(n, o = {}) { cookies.push(`${n}=; Path=${o.path || '/'}; Max-Age=0`); return res },
  }
  let body = {}
  try { body = rawBody ? JSON.parse(rawBody) : {} } catch { /* malformed JSON */ }
  const apiPath = url.pathname.slice(4) || '/'
  const r = { method: req.method, originalUrl: url.pathname + url.search, baseUrl: '', path: apiPath, cookies: parseCookies(req.headers.cookie), body, query: Object.fromEntries(url.searchParams), headers: req.headers, ip: '127.0.0.1', get: (h) => req.headers[h.toLowerCase()] }
  let err = null
  for (const mw of [sanitizeInput, originGuard]) { await new Promise((ok) => mw(r, res, (e) => { err = err || e; ok() })); if (err) break }
  if (!err) {
    const out = await dispatch(routes, req.method, apiPath + url.search, r, { runFinal: true, res })
    err = out.error
    if (!err && !res.sent && !out.reached) { res.status(404).json({ message: 'Route not found' }) }
  }
  if (err) errorHandler(err, r, res, () => {})
  resp.writeHead(res.statusCode, { ...res.headers, ...(cookies.length ? { 'Set-Cookie': cookies } : {}), 'Cache-Control': 'no-store' })
  resp.end(res.body ?? '')
  res.finishCbs.forEach((cb) => cb()) // Express emits 'finish' when the response is written (the audit log middleware relies on it)
}

const dist = path.join(here, 'dist')
http.createServer(async (req, resp) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  try {
    if (url.pathname === '/__test/emails') { resp.writeHead(200, { 'Content-Type': 'application/json' }); return resp.end(JSON.stringify(emails)) }
    if (url.pathname === '/__test/reset') { await seed(); resp.writeHead(200); return resp.end('ok') }
    if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
      const res = { statusCode: 200, headers: {}, type(t) { res.headers['Content-Type'] = t.includes('/') ? t : `text/${t}`; return res }, set(k, v) { res.headers[k] = v; return res }, send(b) { resp.writeHead(200, res.headers); resp.end(b); return res } }
      return url.pathname === '/robots.txt' ? robots(req, res) : sitemap({}, res, (e) => { resp.writeHead(500); resp.end(String(e)) })
    }
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; for await (const c of req) chunks.push(c)
      return await api(req, resp, url, Buffer.concat(chunks).toString())
    }
    let file = path.join(dist, url.pathname)
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html') // SPA fallback
    resp.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(file).pipe(resp)
  } catch (e) { realLog('[sandbox error]', e); resp.writeHead(500); resp.end(String(e)) }
}).listen(PORT, () => realLog(`sandbox ready on http://localhost:${PORT}`))
