import { create } from 'zustand'
import { api } from '../services/api'

// Admin session. The server holds the real session (HTTP-only cookie); this only mirrors it for the UI.
export const useAdminAuth = create((set, get) => ({
  admin: null,
  ready: false,
  init: async () => {
    try { set({ admin: (await api.get('/admin/auth/session')).data.admin }) } catch { set({ admin: null }) }
    set({ ready: true })
  },
  login: async (email, password) => { const { data } = await api.post('/admin/auth/login', { email, password }); set({ admin: data.admin, ready: true }) },
  logout: async () => { await api.post('/admin/auth/logout').catch(() => {}); set({ admin: null }) },
  refresh: async () => { if (get().admin) await get().init() },
}))
if (typeof window !== 'undefined') window.addEventListener('volta:signed-out', (e) => { if (e.detail === 'admin') useAdminAuth.setState({ admin: null }) })

export const useAdminToast = create((set) => ({
  message: null,
  notify: (message) => { set({ message }); setTimeout(() => set({ message: null }), 2800) },
}))
