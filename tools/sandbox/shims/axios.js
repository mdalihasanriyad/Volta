// Sandbox stand-in for axios built on fetch: create(), get/post/put/patch/delete, response interceptors, error.response.
const qs = (p) => { const u = new URLSearchParams(); Object.entries(p || {}).forEach(([k, v]) => v !== undefined && v !== null && u.append(k, v)); const s = u.toString(); return s ? `?${s}` : '' }

function create(defaults = {}) {
  const handlers = []
  async function raw(config) {
    const url = (defaults.baseURL || '') + config.url + qs(config.params)
    const init = { method: (config.method || 'get').toUpperCase(), credentials: defaults.withCredentials ? 'include' : 'same-origin', headers: {} }
    if (config.data !== undefined) { init.body = JSON.stringify(config.data); init.headers['Content-Type'] = 'application/json' }
    let res
    try { res = await fetch(url, init) } catch (e) { throw Object.assign(new Error('Network Error'), { request: {}, config, code: 'ERR_NETWORK' }) }
    const text = await res.text()
    let data = text
    try { data = text ? JSON.parse(text) : null } catch { /* keep text */ }
    const out = { data, status: res.status, headers: res.headers, config }
    if (res.status >= 200 && res.status < 300) return out
    throw Object.assign(new Error(`Request failed with status code ${res.status}`), { response: out, config, request: {} })
  }
  async function request(config) {
    let p = raw(config)
    for (const h of handlers) p = p.then(h.ok, h.err)
    return p
  }
  const instance = (config) => request(config)
  instance.interceptors = { response: { use: (ok = (r) => r, err = (e) => Promise.reject(e)) => handlers.push({ ok, err }) } }
  for (const m of ['get', 'delete']) instance[m] = (url, config = {}) => request({ ...config, url, method: m })
  for (const m of ['post', 'put', 'patch']) instance[m] = (url, data, config = {}) => request({ ...config, url, data, method: m })
  return instance
}
export default { create }
