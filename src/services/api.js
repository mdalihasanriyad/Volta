import axios from 'axios'

// All requests go to /api (same origin in production; Vite proxies it in development). Auth uses HTTP-only cookies.
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 })

const refreshing = { customer: null, admin: null }
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error
    const isAuthCall = config && /^\/(admin\/)?auth\/(login|register|google|refresh|logout|forgot-password|reset-password|verify-email)/.test(config.url || '')
    if (response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true
      const kind = (config.url || '').startsWith('/admin') ? 'admin' : 'customer'
      refreshing[kind] ??= api.post(kind === 'admin' ? '/admin/auth/refresh' : '/auth/refresh').finally(() => { refreshing[kind] = null })
      try {
        await refreshing[kind]
        return api(config) // retry the original request once with the fresh cookies
      } catch {
        window.dispatchEvent(new CustomEvent('volta:signed-out', { detail: kind }))
      }
    }
    return Promise.reject(error)
  }
)

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || (e?.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : e?.request && !e.response ? 'Cannot reach the server. Check your connection.' : fallback)
export const fieldErrors = (e) => e?.response?.data?.fields || {}
