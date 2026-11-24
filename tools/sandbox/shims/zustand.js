import { useRef, useSyncExternalStore } from 'react'

// Sandbox stand-in for zustand (same API subset the app uses: create, getState, setState, subscribe, selectors).
export function create(init) {
  let state
  const listeners = new Set()
  const setState = (partial, replace) => {
    const next = typeof partial === 'function' ? partial(state) : partial
    if (next === state) return
    state = replace ? next : Object.assign({}, state, next)
    listeners.forEach((l) => l())
  }
  const getState = () => state
  const api = { setState, getState, subscribe: (l) => { listeners.add(l); return () => listeners.delete(l) } }
  state = init(setState, getState, api)
  const useStore = (selector = (s) => s) => {
    const memo = useRef(null)
    const snap = () => {
      if (memo.current && memo.current.s === state && memo.current.f === selector) return memo.current.v
      const v = selector(state)
      memo.current = { s: state, f: selector, v }
      return v
    }
    return useSyncExternalStore(api.subscribe, snap, snap)
  }
  Object.assign(useStore, api)
  return useStore
}
export default create
