export const persist = (config, { name }) => (set, get, api) => {
  const wrapped = (p, r) => { set(p, r); try { localStorage.setItem(name, JSON.stringify(get())) } catch { /* ignore */ } }
  const initial = config(wrapped, get, api)
  try { const saved = JSON.parse(localStorage.getItem(name) || 'null'); if (saved) Object.assign(initial, saved) } catch { /* ignore */ }
  return initial
}
