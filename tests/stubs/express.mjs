// A tiny Express stand-in that records routes so tests can walk the REAL middleware chain of every route.
function compile(path) {
  const keys = []
  const rx = new RegExp('^' + path.replace(/\/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '/([^/]+)' }).replace(/\/$/, '') + '/?$')
  return { rx, keys }
}

export function Router() {
  const router = { stack: [], __router: true }
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    router[m] = (path, ...handlers) => { router.stack.push({ type: 'route', method: m.toUpperCase(), path, ...compile(path), handlers: handlers.flat() }); return router }
  }
  router.use = (...args) => {
    let prefixes = ['/']
    if (typeof args[0] === 'string' || Array.isArray(args[0])) prefixes = [].concat(args.shift())
    router.stack.push({ type: 'use', prefixes, handlers: args.flat() })
    return router
  }
  return router
}

const express = () => {
  const app = { calls: [] }
  for (const m of ['set', 'disable', 'use', 'get', 'post']) app[m] = (...args) => { app.calls.push({ m, args }); return app }
  return app
}
express.Router = Router
express.json = () => (req, res, next) => next()
export default express

// ---- dispatch: run the recorded chain for METHOD path with a fake req/res. Stops BEFORE the final handler of a route. ----
export async function dispatch(router, method, url, req = {}, opts = {}) {
  const { runFinal = false } = opts
  const res = opts.res || { statusCode: 200, headers: {}, on() {}, cookie() {}, clearCookie() {}, status(c) { res.statusCode = c; return res }, json(b) { res.body = b; return res }, set() { return res }, setHeader() { return res } }
  req.method = method; req.url = url; req.params = {}; req.cookies ||= {}; req.query ||= {}; req.body ||= {}; req.get ||= () => undefined
  const out = { reached: null, error: null, res }
  await walk(router, url.split('?')[0], req, res, out, runFinal)
  return out
}

async function walk(router, path, req, res, out, runFinal) {
  for (const layer of router.stack) {
    if (out.error || out.reached) return
    if (layer.type === 'use') {
      const hit = layer.prefixes.find((p) => p === '/' || path === p || path.startsWith(p + '/'))
      if (hit === undefined) continue
      const sub = hit === '/' ? path : path.slice(hit.length) || '/'
      for (const h of layer.handlers) {
        if (out.error || out.reached) return
        if (h.__router) { await walk(h, sub, req, res, out, runFinal); continue }
        await call(h, req, res, out)
      }
    } else if (layer.method === req.method) {
      const m = layer.rx.exec(path)
      if (!m) continue
      layer.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]) })
      layer.__matched = true
      for (const [i, h] of layer.handlers.entries()) {
        if (out.error) return
        const isFinal = i === layer.handlers.length - 1
        if (isFinal && !runFinal) { out.reached = `${layer.method} ${layer.path}`; return }
        await call(h, req, res, out)
        if (out.reached) return
      }
      out.reached = out.reached || `${layer.method} ${layer.path}`
      return
    }
  }
}

function call(handler, req, res, out) {
  return new Promise((resolve) => {
    let done = false
    const next = (err) => { if (done) return; done = true; if (err) out.error = err; resolve() }
    try { const r = handler(req, res, next); if (r && typeof r.then === 'function') r.then(() => { if (!done) { done = true; resolve() } }, (e) => next(e)) } catch (e) { next(e) }
    // handlers that respond directly (never call next) finish the chain
    if (!done && handler.length < 3) setTimeout(() => { if (!done) { done = true; out.reached = out.reached || 'handled'; resolve() } }, 0)
  })
}
