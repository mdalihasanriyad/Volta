import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'
import { useCatalog } from './catalog'

export { useCatalog }

/* ---------------- UI ---------------- */
export const useUI = create((set) => ({
  drawer: false,
  setDrawer: (drawer) => set({ drawer }),
  toast: null,
  notify: (message) => {
    set({ toast: { message, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 2600)
  },
}))

/* ---------------- Currency ---------------- */
export const useCurrency = create(persist((set) => ({ code: null, set: (code) => set({ code }) }), { name: 'volta-currency' }))
export function useActiveCurrency() {
  const code = useCurrency((s) => s.code)
  const { currencies, defaultCurrency } = useCatalog()
  return currencies.find((c) => c.code === code) || currencies.find((c) => c.code === defaultCurrency) || currencies[0]
}

/* ---------------- Auth (customers) ---------------- */
export const useAuth = create((set, get) => ({
  user: null,
  ready: false,
  init: async () => {
    try { set({ user: (await api.get('/auth/me')).data.user }) } catch { set({ user: null }) }
    set({ ready: true })
    if (get().user) afterLogin()
  },
  setUser: (user) => { set({ user }); if (user) afterLogin() },
  login: async (email, password) => get().setUser((await api.post('/auth/login', { email, password })).data.user),
  register: async (body) => get().setUser((await api.post('/auth/register', body)).data.user),
  google: async (credential) => get().setUser((await api.post('/auth/google', { credential })).data.user),
  refreshUser: async () => { try { set({ user: (await api.get('/auth/me')).data.user }) } catch { /* ignore */ } },
  logout: async () => {
    await api.post('/auth/logout').catch(() => {})
    set({ user: null })
    // the cart and wishlist live on the server for signed-in users, so clear this device's copy
    useCart.getState().clearLocal(); useWishlist.getState().clearLocal()
  },
}))
if (typeof window !== 'undefined') window.addEventListener('volta:signed-out', (e) => { if (e.detail === 'customer') useAuth.setState({ user: null }) })

function afterLogin() { useCart.getState().mergeServer(); useWishlist.getState().mergeServer() }

/* ---------------- Cart ---------------- */
const keyOf = (productId, variantId, color) => [productId, variantId || '', color || ''].join('|')
const snapOf = (p, v) => ({ name: p.name, slug: p.slug, sku: v?.sku || p.sku, price: v?.price ?? p.price, image: p.image, category: p.category, stock: v ? v.stock : p.stock })
let pushTimer
const schedulePush = (get) => {
  if (!useAuth.getState().user) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    api.put('/cart', { items: get().items.map((i) => ({ product: i.productId, variant: i.variantId || undefined, color: i.color || undefined, quantity: i.qty })) }).catch(() => {})
  }, 600)
}

export const useCart = create(persist((set, get) => ({
  items: [],
  add: (product, { variant = null, color = null, qty = 1 } = {}) => {
    const key = keyOf(product.id, variant?.id, color)
    set((s) => {
      const found = s.items.find((i) => i.key === key)
      return { items: found ? s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(10, i.qty + qty), snap: snapOf(product, variant) } : i)) : [...s.items, { key, productId: product.id, variantId: variant?.id || null, color, model: variant?.model || null, qty, snap: snapOf(product, variant) }] }
    })
    schedulePush(get)
  },
  setQty: (key, qty) => { set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i)) })); schedulePush(get) },
  remove: (key) => { set((s) => ({ items: s.items.filter((i) => i.key !== key) })); schedulePush(get) },
  clearLocal: () => set({ items: [] }),
  // After sign-in: combine this device's cart with the saved server cart, then save the result.
  mergeServer: async () => {
    try {
      const { data } = await api.get('/cart')
      const server = data.items.map((i) => ({
        key: keyOf(i.product._id, i.variant?._id, i.color), productId: i.product._id, variantId: i.variant?._id || null, color: i.color || null, model: i.variant?.model || null, qty: i.quantity,
        snap: { name: i.product.name, slug: i.product.slug, sku: i.variant?.sku || i.product.sku, price: i.variant?.price ?? i.product.price, image: i.product.images?.[0]?.url || null, category: useCatalog.getState().byId[i.product.category]?.slug, stock: i.product.stock },
      }))
      const merged = new Map(server.map((i) => [i.key, i]))
      get().items.forEach((i) => merged.set(i.key, merged.has(i.key) ? { ...i, qty: Math.min(10, Math.max(i.qty, merged.get(i.key).qty)) } : i))
      set({ items: [...merged.values()] })
      schedulePush(get)
    } catch { /* offline: keep the local cart */ }
  },
}), { name: 'volta-cart' }))

/* ---------------- Wishlist ---------------- */
export const useWishlist = create(persist((set, get) => ({
  ids: [],
  toggle: (id) => {
    const has = get().ids.includes(id)
    set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] })
    if (useAuth.getState().user) (has ? api.delete(`/wishlist/${id}`) : api.post(`/wishlist/${id}`)).catch(() => {})
  },
  remove: (id) => { if (get().ids.includes(id)) get().toggle(id) },
  clearLocal: () => set({ ids: [] }),
  mergeServer: async () => {
    try {
      const { data } = await api.get('/wishlist')
      const serverIds = data.map((p) => p._id)
      const local = get().ids
      await Promise.allSettled(local.filter((id) => !serverIds.includes(id)).map((id) => api.post(`/wishlist/${id}`)))
      set({ ids: [...new Set([...serverIds, ...local])] })
    } catch { /* offline */ }
  },
}), { name: 'volta-wishlist' }))

/* ---------------- Compare and recently viewed (device only) ---------------- */
export const useCompare = create(persist((set, get) => ({
  ids: [],
  toggle: (id) => {
    const { ids } = get()
    if (ids.includes(id)) { set({ ids: ids.filter((x) => x !== id) }); return true }
    if (ids.length >= 4) return false
    set({ ids: [...ids, id] })
    return true
  },
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
}), { name: 'volta-compare' }))

export const useRecent = create(persist((set) => ({
  ids: [],
  push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 10) })),
}), { name: 'volta-recent' }))
