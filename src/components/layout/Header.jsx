import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Heart, LayoutGrid, Menu, Scale, Search, ShoppingCart, User, Zap } from 'lucide-react'
import SearchBar from './SearchBar'
import MegaMenu from './MegaMenu'
import CurrencySwitcher from './CurrencySwitcher'
import { useAuth, useCart, useCompare, useUI, useWishlist } from '../../store'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop All' },
  { to: '/shop?sort=newest', label: 'New Arrivals' },
  { to: '/shop?sort=best', label: 'Best Sellers' },
  { to: '/shop?discount=1', label: 'Special Offers' },
  { to: '/contact', label: 'Contact' },
]

function IconLink({ to, label, count, children }) {
  return (
    <Link to={to} aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-gray-100">
      {children}
      {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-deep px-1 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  )
}

export default function Header() {
  const [menu, setMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const setDrawer = useUI((s) => s.setDrawer)
  const user = useAuth((s) => s.user)
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0))
  const wishCount = useWishlist((s) => s.ids.length)
  const compareCount = useCompare((s) => s.ids.length)
  const { pathname, search } = useLocation()
  const current = pathname + search

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="container-x flex items-center gap-3 py-3 lg:gap-8">
        <button type="button" aria-label="Open menu" onClick={() => setDrawer(true)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-gray-100 lg:hidden"><Menu size={22} /></button>

        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-brand"><Zap size={18} fill="currentColor" /></span>
          Volta
        </Link>

        <div className="hidden max-w-2xl flex-1 lg:block"><SearchBar /></div>
        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Search" onClick={() => setSearchOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-gray-100 lg:hidden"><Search size={20} /></button>
          <div className="mr-2 hidden md:block"><CurrencySwitcher /></div>
          <span className="hidden md:block"><IconLink to="/compare" label="Compare" count={compareCount}><Scale size={20} /></IconLink></span>
          <span className="hidden md:block"><IconLink to="/wishlist" label="Wishlist" count={wishCount}><Heart size={20} /></IconLink></span>
          <Link to={user ? '/account' : '/login'} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 md:flex">
            <User size={20} /> {user ? user.name.split(' ')[0] : 'Sign in'}
          </Link>
          <IconLink to="/cart" label="Cart" count={cartCount}><ShoppingCart size={20} /></IconLink>
        </div>
      </div>

      {searchOpen && <div className="container-x pb-3 lg:hidden"><SearchBar autoFocus onDone={() => setSearchOpen(false)} /></div>}

      <nav aria-label="Main" className="hidden bg-ink text-white lg:block">
        <div className="container-x flex items-center">
          <div className="relative" onMouseLeave={() => setMenu(false)}>
            <button
              type="button"
              aria-expanded={menu}
              onMouseEnter={() => setMenu(true)}
              onClick={() => setMenu((v) => !v)}
              className="flex h-12 items-center gap-2 bg-brand-deep px-5 text-sm font-bold"
            >
              <LayoutGrid size={18} /> All Categories
            </button>
            {menu && <MegaMenu onNavigate={() => setMenu(false)} />}
          </div>
          <ul className="flex items-center">
            {links.map((l) => {
              const active = l.end ? pathname === '/' : l.to.includes('?') ? current === l.to : pathname === l.to && !search
              return (
                <li key={l.label}>
                  <NavLink to={l.to} className={`block px-4 py-3.5 text-sm font-semibold transition-colors hover:text-brand ${active ? 'text-brand' : ''}`}>{l.label}</NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </header>
  )
}
