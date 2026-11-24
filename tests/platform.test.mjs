// Deployment-level checks: environment validation, database connection reuse/failure handling, Vercel routing and ESM compatibility.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import mongoose from 'mongoose'
import { env, assertEnv } from '../config/env.js'
import { connectDB } from '../config/db.js'
import handler from '../api/index.js'

const root = path.resolve(import.meta.dirname, '..')
const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

test('the API refuses to start without real secrets and a database URI', () => {
  const saved = { ...env }
  try {
    for (const [k, v] of [['mongoUri', ''], ['jwtSecret', 'short'], ['jwtRefreshSecret', '']]) {
      Object.assign(env, saved, { [k]: v })
      assert.throws(() => assertEnv(), /Missing or weak environment variables/, k)
    }
    Object.assign(env, saved)
    assert.doesNotThrow(() => assertEnv())
  } finally { Object.assign(env, saved) }
})

test('database connection is reused, and a failure is reported as 503 then retried', async () => {
  let attempts = 0
  const realConnect = mongoose.connect
  const cache = globalThis.__voltaMongo
  cache.conn = null; cache.promise = null
  mongoose.connect = async () => { attempts++; throw new Error('ECONNREFUSED') }
  const res = { code: 0, body: null, status(c) { res.code = c; return res }, json(b) { res.body = b; return res } }
  await handler({ method: 'GET', url: '/api/health' }, res)
  assert.equal(res.code, 503)
  assert.deepEqual(res.body, { message: 'Service temporarily unavailable.' })   // no internal error text leaks
  assert.equal(cache.promise, null)                                             // a failed attempt is not cached
  mongoose.connect = async () => { attempts++; return mongoose }
  await connectDB(); await connectDB(); await connectDB()
  assert.equal(attempts, 2)                                                     // one failure + one success; later calls reuse the connection
  mongoose.connect = realConnect
})

// Vercel applies the filesystem first (built assets), then these rewrites in order.
const rewrite = (url) => { for (const r of vercel.rewrites) { const m = new RegExp(`^${r.source}$`).exec(url); if (m) return r.destination } return null }
test('vercel.json routes the API, sitemap/robots and every SPA path (refresh and nested URLs work)', () => {
  const cases = {
    '/api/catalog/products': '/api', '/api/admin/orders/abc': '/api', '/api/auth/me': '/api', '/sitemap.xml': '/api', '/robots.txt': '/api',
    '/': '/index.html', '/shop': '/index.html', '/product/galaxy-s24-ultra-256gb': '/index.html', '/admin/orders': '/index.html', '/admin/login': '/index.html',
    '/account': '/index.html', '/checkout': '/index.html', '/order-tracking': '/index.html', '/verify-email': '/index.html', '/apiary': '/index.html',
  }
  for (const [url, dest] of Object.entries(cases)) assert.equal(rewrite(url), dest, url)
  assert.ok(vercel.functions['api/index.js'].maxDuration >= 10)
})

test('project is deployable from the root: ESM, no separate backend app, API entry exists, all relative imports carry extensions', () => {
  assert.equal(pkg.type, 'module')
  assert.ok(existsSync(path.join(root, 'api/index.js')))
  for (const forbidden of ['frontend', 'backend', 'client', 'server']) assert.equal(existsSync(path.join(root, forbidden)), false, `${forbidden}/ must not exist`)
  assert.equal(pkg.dependencies.typescript, undefined)                           // JavaScript only
  const walk = (d, o = []) => { for (const f of readdirSync(d)) { if (['node_modules', 'dist', 'tests', 'tools', 'e2e', 'src', 'docs', 'public'].includes(f)) continue; const p = path.join(d, f); statSync(p).isDirectory() ? walk(p, o) : /\.js$/.test(f) && o.push(p) } return o }
  const bad = []
  for (const f of walk(root)) for (const m of readFileSync(f, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) if (!/\.(js|json|mjs)$/.test(m[1])) bad.push(`${path.relative(root, f)}: ${m[1]}`)
  assert.deepEqual(bad, [])
})

test('no secret ever reaches the browser bundle or a committed file', () => {
  const gi = readFileSync(path.join(root, '.gitignore'), 'utf8')
  assert.match(gi, /^\.env$/m)
  const example = readFileSync(path.join(root, '.env.example'), 'utf8')
  for (const key of ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL', 'API_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'DEFAULT_CURRENCY']) assert.match(example, new RegExp(`^${key}=`, 'm'), key)
  assert.doesNotMatch(example, /^[A-Z_]+=.{12,}$/m, '.env.example must not contain real values')
  const srcFiles = []
  const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p) : srcFiles.push(p) } }
  walk(path.join(root, 'src'))
  for (const f of srcFiles) {
    const t = readFileSync(f, 'utf8')
    assert.doesNotMatch(t, /JWT_SECRET|JWT_REFRESH_SECRET|CLOUDINARY_API_SECRET|RESEND_API_KEY|GOOGLE_CLIENT_SECRET|process\.env/, path.relative(root, f))
    assert.doesNotMatch(t, /dangerouslySetInnerHTML|localStorage\.setItem\(['"](token|jwt|access)/i, path.relative(root, f))   // no raw HTML, no tokens in storage
  }
})
