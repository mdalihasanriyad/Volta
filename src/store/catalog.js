import { create } from 'zustand'
import { api, errMsg } from '../services/api'

const FALLBACK_CURRENCY = { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 1, decimals: 0, isBase: true, isDefault: true }

// Store-wide data every page needs: categories, brands, currencies and public settings.
export const useCatalog = create((set) => ({
  loaded: false, error: null,
  categories: [], flat: [], byId: {}, bySlug: {}, brands: [],
  currencies: [FALLBACK_CURRENCY], defaultCurrency: 'BDT', settings: {},
  load: async () => {
    try {
      const [cats, brands, cur, settings] = await Promise.all([api.get('/catalog/categories'), api.get('/catalog/brands'), api.get('/catalog/currencies'), api.get('/catalog/settings')])
      const flat = cats.data.flatMap((c) => [c, ...(c.children || [])])
      const currencies = cur.data.currencies.length ? cur.data.currencies : [FALLBACK_CURRENCY]
      set({
        loaded: true, error: null, categories: cats.data, flat,
        byId: Object.fromEntries(flat.map((c) => [c._id, c])), bySlug: Object.fromEntries(flat.map((c) => [c.slug, c])),
        brands: brands.data, currencies, defaultCurrency: cur.data.default || currencies[0].code, settings: settings.data,
      })
    } catch (e) {
      set({ loaded: true, error: errMsg(e, 'We could not load the store. Please refresh.') })
    }
  },
}))
