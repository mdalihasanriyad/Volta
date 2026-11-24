// A small in-memory database that implements just the query operators the services use.
// Writes made with a `session` are recorded so a failed transaction can be rolled back (like MongoDB does).
import * as M from '../../models/index.js'

const clone = (v) => (v === undefined ? v : structuredClone(v))
let seq = 0
export const newId = () => `id${++seq}`
const tick = () => Promise.resolve()
const DEFAULTS = { ProductVariant: { isActive: true }, Coupon: { usedCount: 0, active: true } } // what the real schemas default to

function pathValues(obj, path) {
  let cur = [obj]
  for (const k of path.split('.')) cur = cur.flatMap((c) => (c == null ? [] : Array.isArray(c) ? c.map((x) => x?.[k]) : [c[k]])).filter((x) => x !== undefined || true)
  return cur.flatMap((x) => (Array.isArray(x) ? x : [x]))
}
function matches(doc, f) {
  for (const [k, v] of Object.entries(f)) {
    if (k === '$or') { if (!v.some((c) => matches(doc, c))) return false; continue }
    if (k === '$expr') {
      const [[op, [a, b]]] = Object.entries(v)
      const val = (x) => (typeof x === 'string' && x.startsWith('$') ? doc[x.slice(1)] : x)
      if (op === '$lt' && !(val(a) < val(b))) return false
      if (op === '$lte' && !(val(a) <= val(b))) return false
      continue
    }
    const vals = pathValues(doc, k)
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      for (const [op, x] of Object.entries(v)) {
        const d = vals[0]
        if (op === '$in' && !vals.some((y) => x.map(String).includes(String(y)))) return false
        if (op === '$nin' && vals.some((y) => x.includes(y))) return false
        if (op === '$gte' && !(d >= x)) return false
        if (op === '$gt' && !(d > x)) return false
        if (op === '$exists' && (d !== undefined) !== x) return false
      }
    } else if (!vals.some((y) => String(y) === String(v))) return false
  }
  return true
}
const setPath = (o, path, val) => { const ks = path.split('.'); let c = o; ks.slice(0, -1).forEach((k) => { c = c[k] ||= {} }); c[ks.at(-1)] = val }
// Applies a Mongo-style update and returns a function that undoes ONLY this change (so concurrent transactions do not clobber each other).
function applyUpdate(doc, u) {
  const undo = []
  const get = (p) => p.split('.').reduce((a, x) => a?.[x], doc)
  for (const [k, v] of Object.entries(u)) {
    if (k === '$inc') Object.entries(v).forEach(([p, n]) => { setPath(doc, p, (get(p) || 0) + n); undo.push(() => setPath(doc, p, (get(p) || 0) - n)) })
    else if (k === '$set' || !k.startsWith('$')) Object.entries(k === '$set' ? v : { [k]: v }).forEach(([p, x]) => { const prev = get(p); setPath(doc, p, x); undo.push(() => setPath(doc, p, prev)) })
    else if (k === '$push') Object.entries(v).forEach(([p, x]) => { const arr = (doc[p] ||= []); arr.push(clone(x)); undo.push(() => arr.pop()) })
  }
  return () => undo.reverse().forEach((f) => f())
}
const q = (v) => { const o = { lean: () => o, select: () => o, sort: () => o, populate: () => o, limit: () => o, session: () => o, then: (a, b) => Promise.resolve(clone(v)).then(a, b) }; return o }

export function install() {
  const db = { Product: [], ProductVariant: [], ShippingZone: [], Currency: [], Coupon: [], Inventory: [], StockMovement: [], Order: [], Cart: [], Notification: [], Review: [], Category: [], Brand: [], Admin: [], ActivityLog: [] }
  const col = (n) => db[n]
  const find = (n, f) => col(n).filter((d) => matches(d, f))
  const logUndo = (session, fn) => session?.undo?.push(fn)

  for (const name of Object.keys(db)) {
    const model = M[name]
    Object.assign(model, {
      find: (f = {}) => q(find(name, f)),
      findOne: (f = {}) => q(find(name, f)[0] || null),
      findById: (id) => q(find(name, { _id: id })[0] || null),
      exists: (f) => q(find(name, f)[0] ? { _id: find(name, f)[0]._id } : null),
      countDocuments: async (f = {}) => find(name, f).length,
      create: async (docs, opts = {}) => {
        await tick()
        const list = (Array.isArray(docs) ? docs : [docs]).map((d) => ({ _id: newId(), createdAt: new Date(), ...(DEFAULTS[name] || {}), ...clone(d) }))
        list.forEach((d) => { col(name).push(d); logUndo(opts.session, () => { col(name).splice(col(name).indexOf(d), 1) }) })
        return Array.isArray(docs) ? clone(list) : clone(list[0])
      },
      updateOne: async (f, u, opts = {}) => {
        await tick()
        const d = find(name, f)[0]
        if (!d) return { matchedCount: 0 }
        logUndo(opts.session, applyUpdate(d, u))
        return { matchedCount: 1 }
      },
      findOneAndUpdate: async (f, u, opts = {}) => {
        await tick()
        const d = find(name, f)[0] // check and change happen in the same tick, like MongoDB's atomic single-document update
        if (!d) return null
        const before = clone(d)
        logUndo(opts.session, applyUpdate(d, u))
        return clone(opts.new ? d : before)
      },
      deleteOne: async (f, opts = {}) => {
        const d = find(name, f)[0]
        if (!d) return
        const i = col(name).indexOf(d)
        col(name).splice(i, 1)
        logUndo(opts.session, () => { col(name).splice(i, 0, d) })
      },
    })
  }
  return db
}
export const seedBasic = (db) => {
  db.Currency.push({ _id: 'cur1', code: 'BDT', symbol: '৳', rate: 1, decimals: 0, isBase: true, isDefault: true, isActive: true }, { _id: 'cur2', code: 'USD', symbol: '$', rate: 0.0082, decimals: 2, isActive: true })
  db.ShippingZone.push(
    { _id: 'z1', name: 'Dhaka', countries: ['BD'], regions: ['Dhaka'], baseFee: 80, expressFee: 160, freeThreshold: 5000, eta: '1-2 days', codAvailable: true, isActive: true },
    { _id: 'z2', name: 'Outside', countries: ['BD'], regions: [], baseFee: 130, expressFee: null, freeThreshold: 8000, codAvailable: true, isActive: true },
    { _id: 'z3', name: 'World', countries: ['*'], regions: [], baseFee: 4800, expressFee: null, freeThreshold: 0, codAvailable: false, isActive: true })
  db.Product.push({ _id: 'p1', name: 'Phone', sku: 'SKU-1', status: 'active', price: 1000, category: 'c1', hasVariants: false, images: [], colors: [{ name: 'Black' }], stock: 3, soldCount: 0 })
  db.Inventory.push({ _id: 'i1', sku: 'SKU-1', product: 'p1', quantity: 3, reorderLevel: 2, costPrice: 700 })
  db.Category.push({ _id: 'c1', name: 'Phones', slug: 'phones', isActive: true })
}
