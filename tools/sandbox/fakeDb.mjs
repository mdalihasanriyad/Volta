// A richer in-memory database for end-to-end runs: schema defaults, timestamps, unique indexes, select:false fields, populate, sort/skip/limit,
// upserts, $inc/$set/$push/$pull/$addToSet, aggregate (the stages the app uses), live documents with save(), and transaction undo logs.
import * as M from '../../models/index.js'

const clone = (v) => (v === undefined ? v : structuredClone(v))
let seq = 0
const newId = () => (++seq).toString(16).padStart(24, '0')
const isLeaf = (f) => typeof f.type === 'function' || Array.isArray(f.type) || typeof f.type === 'string'

function defaultsOf(def) {
  const out = {}
  for (const [k, f] of Object.entries(def || {})) {
    if (Array.isArray(f)) { out[k] = []; continue }
    if (!f || typeof f !== 'object' || typeof f === 'function') continue
    if ('default' in f && isLeaf(f)) out[k] = typeof f.default === 'function' ? f.default() : clone(f.default)
    else if (Array.isArray(f.type)) out[k] = []
    else if (!isLeaf(f) && !('ref' in f)) { const n = defaultsOf(f); if (Object.keys(n).length) out[k] = n }
  }
  return out
}
const fieldDefs = (schema) => schema?.def || {}
const hiddenOf = (schema) => Object.entries(fieldDefs(schema)).filter(([, f]) => f && f.select === false).map(([k]) => k)
const normalize = (schema, doc) => {
  for (const [k, f] of Object.entries(fieldDefs(schema))) {
    if (typeof doc[k] !== 'string' || !f || typeof f !== 'object') continue
    if (f.trim) doc[k] = doc[k].trim()
    if (f.lowercase) doc[k] = doc[k].toLowerCase()
    if (f.uppercase) doc[k] = doc[k].toUpperCase()
  }
}

const pathVals = (obj, path) => {
  let cur = [obj]
  for (const k of path.split('.')) cur = cur.flatMap((c) => (c == null ? [] : Array.isArray(c) ? c.map((x) => x?.[k]) : [c[k]]))
  return cur.flatMap((x) => (Array.isArray(x) ? x : [x]))
}
const eq = (a, b) => (a instanceof Date || b instanceof Date ? new Date(a).getTime() === new Date(b).getTime() : String(a) === String(b))
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
    const vals = pathVals(doc, k)
    if (v instanceof RegExp) { if (!vals.some((y) => typeof y === 'string' && v.test(y))) return false; continue }
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      for (const [op, x] of Object.entries(v)) {
        const d = vals[0]
        if (op === '$in' && !vals.some((y) => x.some((z) => eq(y, z)))) return false
        if (op === '$nin' && vals.some((y) => x.some((z) => eq(y, z)))) return false
        if (op === '$ne' && vals.some((y) => eq(y, x))) return false
        if (op === '$gte' && !(d >= x)) return false
        if (op === '$gt' && !(d > x)) return false
        if (op === '$lte' && !(d <= x)) return false
        if (op === '$lt' && !(d < x)) return false
        if (op === '$exists' && (d !== undefined) !== x) return false
      }
    } else if (v === null ? !vals.every((y) => y == null) : !vals.some((y) => eq(y, v))) return false
  }
  return true
}

const getp = (o, p) => p.split('.').reduce((a, x) => a?.[x], o)
const setp = (o, p, val) => { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach((k) => { c = c[k] ||= {} }); c[ks.at(-1)] = val }
function applyUpdate(doc, u, inserting) {
  const undo = []
  for (const [k, v] of Object.entries(u)) {
    if (k === '$inc') Object.entries(v).forEach(([p, n]) => { setp(doc, p, (getp(doc, p) || 0) + n); undo.push(() => setp(doc, p, (getp(doc, p) || 0) - n)) })
    else if (k === '$set' || !k.startsWith('$')) Object.entries(k === '$set' ? v : { [k]: v }).forEach(([p, x]) => { const prev = getp(doc, p); setp(doc, p, x); undo.push(() => setp(doc, p, prev)) })
    else if (k === '$push') Object.entries(v).forEach(([p, x]) => { const arr = (doc[p] ||= []); arr.push(clone(x)); undo.push(() => arr.pop()) })
    else if (k === '$addToSet') Object.entries(v).forEach(([p, x]) => { const arr = (doc[p] ||= []); if (!arr.some((y) => eq(y, x))) { arr.push(x); undo.push(() => arr.pop()) } })
    else if (k === '$pull') Object.entries(v).forEach(([p, x]) => { const prev = [...(doc[p] || [])]; doc[p] = prev.filter((y) => !eq(y, x)); undo.push(() => { doc[p] = prev }) })
    else if (k === '$setOnInsert' && inserting) Object.entries(v).forEach(([p, x]) => setp(doc, p, clone(x)))
  }
  return () => undo.reverse().forEach((f) => f())
}

// ---- aggregate ----
const iso = (d) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return [t.getUTCFullYear(), Math.ceil(((t - y0) / 86400000 + 1) / 7)] }
const p2 = (n) => String(n).padStart(2, '0')
function ev(e, doc) {
  if (typeof e === 'string' && e.startsWith('$')) { const v = pathVals(doc, e.slice(1)); return e.slice(1).includes('.') || Array.isArray(getp(doc, e.slice(1))) ? v : v[0] }
  if (Array.isArray(e)) return e.map((x) => ev(x, doc))
  if (e && typeof e === 'object' && !(e instanceof Date)) {
    const [[op, a]] = Object.entries(e)
    if (op === '$sum') { const v = ev(a, doc); return Array.isArray(v) ? v.reduce((n, x) => n + (Number(x) || 0), 0) : Number(v) || 0 }
    if (op === '$multiply') return ev(a, doc).reduce((n, x) => n * (Number(x) || 0), 1)
    if (op === '$dateToString') {
      const d = new Date(new Date(ev(a.date, doc)).getTime() + 6 * 3600000) // Asia/Dhaka (UTC+6)
      const [gy, gw] = iso(d)
      return a.format.replace('%Y', d.getUTCFullYear()).replace('%m', p2(d.getUTCMonth() + 1)).replace('%d', p2(d.getUTCDate())).replace('%G', gy).replace('%V', p2(gw))
    }
  }
  return e
}
function aggregate(rows, pipeline) {
  let cur = rows.map(clone)
  for (const stage of pipeline) {
    const [[op, a]] = Object.entries(stage)
    if (op === '$match') cur = cur.filter((d) => matches(d, a))
    else if (op === '$unwind') { const p = a.replace('$', ''); cur = cur.flatMap((d) => (d[p] || []).map((x) => ({ ...d, [p]: x }))) }
    else if (op === '$sort') cur = [...cur].sort((x, y) => { for (const [k, dir] of Object.entries(a)) { const ax = getp(x, k), ay = getp(y, k); if (ax < ay) return -dir; if (ax > ay) return dir } return 0 })
    else if (op === '$limit') cur = cur.slice(0, a)
    else if (op === '$project') cur = cur.map((d) => { const o = {}; for (const [k, v] of Object.entries(a)) { if (v === 1) o[k] = d[k]; else if (typeof v === 'string') o[k] = ev(v, d) } if (a._id !== 0) o._id = d._id; return o })
    else if (op === '$group') {
      const groups = new Map()
      for (const d of cur) {
        const id = a._id === null ? null : ev(a._id, d)
        const key = JSON.stringify(id)
        if (!groups.has(key)) groups.set(key, { _id: id, _rows: [] })
        groups.get(key)._rows.push(d)
      }
      cur = [...groups.values()].map((g) => {
        const o = { _id: g._id }
        for (const [k, spec] of Object.entries(a)) {
          if (k === '_id') continue
          const [[acc, expr]] = Object.entries(spec)
          const vals = g._rows.map((d) => ev(expr, d))
          if (acc === '$sum') o[k] = vals.reduce((n, v) => n + (Array.isArray(v) ? v.reduce((x, y) => x + y, 0) : Number(v) || 0), 0)
          else if (acc === '$avg') o[k] = vals.reduce((n, v) => n + v, 0) / vals.length
          else if (acc === '$first') o[k] = Array.isArray(vals[0]) ? vals[0][0] : vals[0]
        }
        return o
      })
    }
  }
  return cur
}

export function createFakeDb() {
  const data = {}
  const names = Object.keys(M)
  const hasOwnerSchema = (n) => M[n].schema
  const refOf = (n, path) => {
    let def = fieldDefs(M[n].schema)
    for (const k of path.split('.')) { let f = def[k]; if (Array.isArray(f)) f = f[0]; if (f?.ref) return f.ref; if (!f) return null; def = f }
    return null
  }

  function makeDoc(n, raw) {
    const d = raw
    const hide = (name, fn) => Object.defineProperty(d, name, { value: fn, enumerable: false, configurable: true, writable: true })
    hide('save', async () => { normalize(M[n].schema, d); checkUnique(n, d); if (M[n].schema?.opts?.timestamps) d.updatedAt = new Date(); return d })
    hide('toObject', () => clone(d))
    hide('deleteOne', async () => { data[n].splice(data[n].indexOf(d), 1) })
    return d
  }
  function checkUnique(n, doc) {
    const schema = M[n].schema
    const rules = [...Object.entries(fieldDefs(schema)).filter(([, f]) => f && f.unique).map(([k]) => [k]), ...(schema?.indexes || []).filter(([, o]) => o.unique).map(([f]) => Object.keys(f))]
    for (const keys of rules) {
      if (keys.some((k) => doc[k] === undefined || doc[k] === null)) continue
      const clash = data[n].find((o) => o !== doc && keys.every((k) => eq(o[k], doc[k])))
      if (clash) throw Object.assign(new Error(`E11000 duplicate key ${keys.join(',')}`), { code: 11000, keyPattern: Object.fromEntries(keys.map((k) => [k, 1])) })
    }
  }
  const build = (n, input) => {
    const schema = M[n].schema
    const o = { _id: newId(), ...defaultsOf(fieldDefs(schema)), ...clone(input) }
    const ts = schema?.opts?.timestamps
    if (ts) { const now = new Date(); if (ts === true || ts.createdAt) o.createdAt ||= now; if (ts === true || ts.updatedAt) o.updatedAt ||= now }
    normalize(schema, o)
    return o
  }
  const normFilter = (n, f) => {
    const out = { ...f }
    for (const [k, def] of Object.entries(fieldDefs(M[n].schema))) if (typeof out[k] === 'string' && def && typeof def === 'object') { if (def.lowercase) out[k] = out[k].toLowerCase(); if (def.uppercase) out[k] = out[k].toUpperCase() }
    return out
  }

  function query(n, filter, single, opts = {}) {
    const q = { _lean: false, _sel: '', _pop: [], _sort: null, _skip: 0, _limit: Infinity, _session: null }
    const run = () => {
      let rows = data[n].filter((d) => matches(d, normFilter(n, filter || {})))
      if (q._sort) rows = [...rows].sort((a, b) => { for (const [k, dir] of Object.entries(q._sort)) { const ax = a[k], ay = b[k]; if (ax < ay) return -dir; if (ax > ay) return dir } return 0 })
      rows = rows.slice(q._skip, q._skip + q._limit)
      if (single) rows = rows.slice(0, 1)
      const copy = q._lean || q._pop.length
      let out = copy ? rows.map(clone) : rows
      if (copy) {
        const plus = q._sel.split(/\s+/).filter((x) => x.startsWith('+')).map((x) => x.slice(1))
        out = out.map((d) => {
          hiddenOf(M[n].schema).filter((h) => !plus.includes(h)).forEach((h) => delete d[h])
          q._sel.split(/\s+/).filter((x) => x.startsWith('-')).forEach((x) => delete d[x.slice(1)])
          const inc = q._sel.split(/\s+/).filter((x) => x && !x.startsWith('-') && !x.startsWith('+'))
          if (inc.length) for (const k of Object.keys(d)) if (k !== '_id' && !inc.some((i) => i === k || i.startsWith(k + '.'))) delete d[k]
          return d
        })
        for (const [path, sel, match] of q._pop) {
          const ref = refOf(n, path)
          if (!ref) continue
          const fields = (sel || '').split(/\s+/).filter(Boolean)
          const pick = (id) => { const t = data[ref].find((x) => eq(x._id, id)); if (!t || (match && !matches(t, match))) return null; const c = clone(t); hiddenOf(M[ref].schema).forEach((h) => delete c[h]); if (fields.length) for (const k of Object.keys(c)) if (k !== '_id' && !fields.includes(k)) delete c[k]; return c }
          const [head, ...rest] = path.split('.')
          for (const d of out) {
            if (!rest.length) d[head] = Array.isArray(d[head]) ? d[head].map(pick).filter((x) => x !== null || !match) : d[head] == null ? d[head] : pick(d[head])
            else (d[head] || []).forEach((sub) => { if (sub[rest[0]] != null) sub[rest[0]] = pick(sub[rest[0]]) })
          }
        }
      }
      if (!single) return out
      return out[0] ? (copy ? out[0] : makeDoc(n, out[0])) : null
    }
    Object.assign(q, {
      lean() { q._lean = true; return q }, select(s) { q._sel = String(s || ''); return q }, sort(s) { q._sort = s; return q }, skip(x) { q._skip = x; return q }, limit(x) { q._limit = x; return q },
      populate(p, s) { q._pop.push(typeof p === 'object' ? [p.path, p.select, p.match] : [p, s]); return q }, session() { return q },
      then(a, b) { try { return Promise.resolve(run()).then(a, b) } catch (e) { return Promise.reject(e).then(a, b) } },
    })
    if (!opts.eager) return q
    return q
  }

  for (const n of names) {
    data[n] = []
    const model = M[n]
    const log = (session, fn) => session?.undo?.push(fn)
    const insert = (input, session) => {
      const o = build(n, input)
      checkUnique(n, o)
      data[n].push(o)
      log(session, () => { const i = data[n].indexOf(o); if (i >= 0) data[n].splice(i, 1) })
      return o
    }
    const upsertDoc = (filter, update) => { const base = Object.fromEntries(Object.entries(filter).filter(([k, v]) => !k.startsWith('$') && (v === null || typeof v !== 'object' || v instanceof Date))); return base }
    Object.assign(model, {
      find: (f = {}) => query(n, f, false),
      findOne: (f = {}) => query(n, f, true),
      findById: (id) => query(n, { _id: id }, true),
      exists: (f) => { const q = query(n, f, true); const base = q.then.bind(q); q.then = (a, b) => base((d) => (d ? { _id: d._id } : null)).then(a, b); return q },
      countDocuments: async (f = {}) => data[n].filter((d) => matches(d, normFilter(n, f))).length,
      create: async (docs, opts = {}) => { const list = (Array.isArray(docs) ? docs : [docs]).map((d) => insert(d, opts.session)); const out = list.map((d) => makeDoc(n, d)); return Array.isArray(docs) ? out : out[0] },
      updateOne: async (f, u, opts = {}) => {
        let d = data[n].find((x) => matches(x, normFilter(n, f)))
        let inserting = false
        if (!d && opts.upsert) { d = insert(upsertDoc(f, u), opts.session); inserting = true }
        if (!d) return { matchedCount: 0 }
        log(opts.session, applyUpdate(d, u, inserting)); checkUnique(n, d)
        return { matchedCount: 1 }
      },
      updateMany: async (f, u, opts = {}) => { for (const d of data[n].filter((x) => matches(x, normFilter(n, f)))) log(opts.session, applyUpdate(d, u)); return {} },
      findOneAndUpdate: async (f, u, opts = {}) => {
        let d = data[n].find((x) => matches(x, normFilter(n, f)))
        let inserting = false
        if (!d && opts.upsert) { d = insert(upsertDoc(f, u), opts.session); inserting = true }
        if (!d) return null
        const before = clone(d)
        log(opts.session, applyUpdate(d, u, inserting)); checkUnique(n, d)
        return opts.new ? makeDoc(n, d) : makeDoc(n, before)
      },
      findByIdAndUpdate: async (id, u, opts = {}) => model.findOneAndUpdate({ _id: id }, u, opts),
      findOneAndDelete: async (f) => { const d = data[n].find((x) => matches(x, normFilter(n, f))); if (d) data[n].splice(data[n].indexOf(d), 1); return d || null },
      findByIdAndDelete: async (id) => model.findOneAndDelete({ _id: id }),
      deleteOne: async (f, opts = {}) => { const d = data[n].find((x) => matches(x, normFilter(n, f))); if (!d) return; const i = data[n].indexOf(d); data[n].splice(i, 1); log(opts.session, () => data[n].splice(i, 0, d)) },
      deleteMany: async (f) => { data[n] = data[n].filter((d) => !matches(d, normFilter(n, f))) },
      aggregate: async (pipeline) => aggregate(data[n], pipeline),
    })
  }
  return { data, reset() { names.forEach((n) => { data[n] = [] }); seq = 0 } }
}
