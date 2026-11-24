// Sandbox stand-in for react-hook-form v7 (uncontrolled inputs read from the DOM; Controller; useFieldArray; the validation rules the app uses).
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o)
const setPath = (o, p, v) => { const ks = p.split('.'); let c = o; ks.slice(0, -1).forEach((k, i) => { if (c[k] == null) c[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; c = c[k] }); c[ks.at(-1)] = v }
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
let uid = 0

function applyValue(el, value) {
  if (el.type === 'checkbox') el.checked = !!value
  else if (el.type === 'radio') el.checked = String(el.value) === String(value)
  else el.value = value ?? ''
}
function readEl(name, el) {
  if (el.type === 'checkbox') return el.checked
  if (el.type === 'radio') { const r = [...document.getElementsByName(name)].find((x) => x.checked); return r ? r.value : undefined }
  return el.value
}

export function useForm({ defaultValues = {} } = {}) {
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])
  const ref = useRef(null)
  if (!ref.current) ref.current = { defaults: clone(defaultValues) || {}, fields: new Map(), rules: {}, refs: {}, controlled: {}, errors: {}, submitting: false, submitted: false, watched: new Set(), rerender }
  const s = ref.current
  s.rerender = rerender

  const valueOf = (name) => {
    const f = s.fields.get(name)
    if (f) return readEl(name, f)
    if (name in s.controlled) return s.controlled[name]
    return getPath(s.defaults, name)
  }
  const collect = () => {
    const out = clone(s.defaults) || {}
    for (const [name] of s.fields) setPath(out, name, valueOf(name))
    for (const name of Object.keys(s.controlled)) setPath(out, name, s.controlled[name])
    return out
  }
  const syncDefaults = () => { for (const [name] of s.fields) setPath(s.defaults, name, valueOf(name)) }

  const validate = (values) => {
    const errors = {}
    for (const [name] of s.fields) {
      const r = s.rules[name] || {}
      const v = valueOf(name)
      const empty = v === undefined || v === null || v === '' || v === false
      const msg = (x, d = '') => (typeof x === 'object' && x && 'message' in x ? x.message : d)
      const val = (x) => (typeof x === 'object' && x && 'value' in x ? x.value : x)
      let err = null
      if (r.required && empty) err = { type: 'required', message: typeof r.required === 'string' ? r.required : '' }
      else if (!empty) {
        const str = String(v)
        if (r.minLength && str.length < val(r.minLength)) err = { type: 'minLength', message: msg(r.minLength) }
        else if (r.maxLength && str.length > val(r.maxLength)) err = { type: 'maxLength', message: msg(r.maxLength) }
        else if (r.min !== undefined && Number(v) < val(r.min)) err = { type: 'min', message: msg(r.min) }
        else if (r.max !== undefined && Number(v) > val(r.max)) err = { type: 'max', message: msg(r.max) }
        else if (r.pattern && !(val(r.pattern) instanceof RegExp ? val(r.pattern) : new RegExp(val(r.pattern))).test(str)) err = { type: 'pattern', message: msg(r.pattern) }
        else if (typeof r.validate === 'function') { const res = r.validate(v, values); if (res !== true && res !== undefined) err = { type: 'validate', message: typeof res === 'string' ? res : '' } }
      } else if (typeof r.validate === 'function' && !r.required) {
        const res = r.validate(v, values); if (res !== true && res !== undefined) err = { type: 'validate', message: typeof res === 'string' ? res : '' }
      }
      if (err) errors[name] = err
    }
    return errors
  }

  const register = (name, rules = {}) => {
    s.rules[name] = rules
    s.refs[name] ||= (el) => {
      if (!el) { s.fields.delete(name); return }
      const had = s.fields.get(name) === el
      s.fields.set(name, el)
      if (!had) applyValue(el, getPath(s.defaults, name))
    }
    return {
      name, ref: s.refs[name],
      onChange: () => { if (s.submitted) { s.errors = validate(collect()); rerender() } else if (s.watched.has(name) || s.watched.has('*')) rerender() },
      onBlur: () => {},
    }
  }
  const handleSubmit = (onValid) => async (e) => {
    e?.preventDefault?.()
    s.submitted = true; s.submitting = true; rerender()
    const values = collect()
    s.errors = validate(values)
    try { if (!Object.keys(s.errors).length) await onValid(values, e) } finally { s.submitting = false; rerender() }
  }
  const watch = (name) => {
    if (name === undefined) { s.watched.add('*'); return collect() }
    s.watched.add(name)
    return valueOf(name)
  }
  const setValue = (name, v) => {
    const el = s.fields.get(name)
    if (el) applyValue(el, v); else if (name in s.controlled) s.controlled[name] = v
    setPath(s.defaults, name, v)
    rerender()
  }
  const reset = (values) => {
    if (values) s.defaults = clone(values)
    s.errors = {}; s.submitted = false
    for (const [name, el] of s.fields) applyValue(el, getPath(s.defaults, name))
    for (const name of Object.keys(s.controlled)) s.controlled[name] = getPath(s.defaults, name)
    rerender()
  }
  const setError = (name, err) => { s.errors = { ...s.errors, [name]: { type: 'manual', message: err?.message || '' } }; rerender() }
  const clearErrors = () => { s.errors = {}; rerender() }

  return {
    register, handleSubmit, watch, setValue, reset, setError, clearErrors, getValues: (n) => (n ? valueOf(n) : collect()),
    control: { _s: s, syncDefaults },
    formState: { errors: s.errors, isSubmitting: s.submitting, isSubmitted: s.submitted, isValid: Object.keys(s.errors).length === 0 },
  }
}

export function Controller({ name, control, render }) {
  const s = control._s
  if (!(name in s.controlled)) s.controlled[name] = clone(getPath(s.defaults, name))
  const field = {
    name, value: s.controlled[name], ref: () => {}, onBlur: () => {},
    onChange: (v) => { s.controlled[name] = v && v.target ? v.target.value : v; s.rerender() },
  }
  return render({ field, fieldState: { error: s.errors[name] } })
}

export function useFieldArray({ control, name }) {
  const s = control._s
  const rows = getPath(s.defaults, name) || []
  rows.forEach((r) => { r.id ||= `fa${++uid}` })
  if (!getPath(s.defaults, name)) setPath(s.defaults, name, rows)
  return {
    fields: rows,
    append: (row) => { control.syncDefaults(); const arr = getPath(s.defaults, name) || []; arr.push({ ...clone(row), id: `fa${++uid}` }); setPath(s.defaults, name, arr); s.rerender() },
    remove: (i) => { control.syncDefaults(); getPath(s.defaults, name).splice(i, 1); s.rerender() },
  }
}
