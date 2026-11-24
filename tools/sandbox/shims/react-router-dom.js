// Sandbox stand-in for react-router-dom v6 (history API based): BrowserRouter, Routes/Route (nested, index, splat), Outlet, Link, NavLink,
// Navigate, useNavigate, useLocation, useParams, useSearchParams.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const RouterCtx = createContext(null)
const OutletCtx = createContext(null)
const ParamsCtx = createContext({})

export function BrowserRouter({ children }) {
  const read = () => ({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash, state: window.history.state?.usr ?? null, key: String(window.history.state?.key ?? 'default') })
  const [location, setLocation] = useState(read)
  useEffect(() => { const h = () => setLocation(read()); window.addEventListener('popstate', h); return () => window.removeEventListener('popstate', h) }, [])
  const navigate = useCallback((to, opts = {}) => {
    if (typeof to === 'number') { window.history.go(to); return }
    const url = new URL(to, window.location.origin + window.location.pathname)
    const full = url.pathname + url.search + url.hash
    window.history[opts.replace ? 'replaceState' : 'pushState']({ usr: opts.state ?? null, key: Math.random().toString(36).slice(2) }, '', full)
    setLocation(read())
  }, [])
  return <RouterCtx.Provider value={{ location, navigate }}>{children}</RouterCtx.Provider>
}

const flatten = (children, base = '', chain = [], out = []) => {
  React.Children.forEach(children, (el) => {
    if (!React.isValidElement(el)) return
    const { path, index, element, children: kids } = el.props
    const full = index ? base : path === '*' ? `${base}/*` : path ? `${base}/${path}`.replace(/\/+/g, '/') : base
    const node = { element, full, index: !!index, path }
    if (kids) flatten(kids, full, [...chain, node], out)
    out.push({ pattern: full || '/', chain: [...chain, node], isLeaf: !kids })
  })
  return out
}
const matchPattern = (pattern, pathname) => {
  const ps = pattern.split('/').filter(Boolean), xs = pathname.split('/').filter(Boolean)
  const params = {}
  for (let i = 0; i < ps.length; i++) {
    if (ps[i] === '*') return { params, score: 1 }
    if (xs[i] === undefined) return null
    if (ps[i].startsWith(':')) params[ps[i].slice(1)] = decodeURIComponent(xs[i])
    else if (ps[i] !== xs[i]) return null
  }
  if (xs.length !== ps.length) return null
  return { params, score: ps.reduce((n, p) => n + (p.startsWith(':') ? 2 : 3), 0) + 1 }
}

export function Routes({ children }) {
  const { location } = useContext(RouterCtx)
  const branches = useMemo(() => flatten(children).filter((b) => b.isLeaf), [children])
  let best = null
  for (const b of branches) { const m = matchPattern(b.pattern, location.pathname); if (m && (!best || m.score > best.m.score)) best = { b, m } }
  if (!best) return null
  const chain = best.b.chain
  let node = null
  for (let i = chain.length - 1; i >= 0; i--) {
    const el = chain[i].element
    node = el === undefined ? <OutletCtx.Provider value={node}>{node}</OutletCtx.Provider> : <OutletCtx.Provider value={node}>{el}</OutletCtx.Provider>
  }
  return <ParamsCtx.Provider value={best.m.params}>{node}</ParamsCtx.Provider>
}
export const Route = () => null
export const Outlet = () => useContext(OutletCtx)

export const useNavigate = () => useContext(RouterCtx).navigate
export const useLocation = () => useContext(RouterCtx).location
export const useParams = () => useContext(ParamsCtx)
export function useSearchParams() {
  const { location, navigate } = useContext(RouterCtx)
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const set = useCallback((next, opts) => {
    const v = typeof next === 'function' ? next(params) : next
    const sp = v instanceof URLSearchParams ? v : new URLSearchParams(v)
    navigate(`${location.pathname}${sp.toString() ? `?${sp}` : ''}`, opts)
  }, [location.pathname, navigate, params])
  return [params, set]
}

export function Link({ to, state, replace, onClick, children, ...rest }) {
  const { navigate } = useContext(RouterCtx)
  return <a href={to} {...rest} onClick={(e) => { onClick?.(e); if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || rest.target === '_blank') return; e.preventDefault(); navigate(to, { state, replace }) }}>{children}</a>
}
export function NavLink({ to, end, className, children, ...rest }) {
  const { location } = useContext(RouterCtx)
  const path = to.split('?')[0]
  const isActive = end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/')
  return <Link to={to} className={typeof className === 'function' ? className({ isActive }) : className} aria-current={isActive ? 'page' : undefined} {...rest}>{typeof children === 'function' ? children({ isActive }) : children}</Link>
}
export function Navigate({ to, replace, state }) {
  const { navigate } = useContext(RouterCtx)
  useEffect(() => { navigate(to, { replace, state }) }, [to]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
