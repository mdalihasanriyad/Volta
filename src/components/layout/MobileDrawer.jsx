import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Heart, Scale, User, X } from 'lucide-react'
import { useCatalog } from '../../store/catalog'
import CategoryIcon from '../ui/CategoryIcon'
import CurrencySwitcher from './CurrencySwitcher'
import { useAuth, useUI } from '../../store'

export default function MobileDrawer() {
  const { drawer, setDrawer } = useUI()
  const categories = useCatalog((st) => st.categories)
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(null)
  const { pathname } = useLocation()

  useEffect(() => { setDrawer(false) }, [pathname, setDrawer])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawer])

  if (!drawer) return null
  const close = () => setDrawer(false)

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50" onClick={close} />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white">
        <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
          <span className="text-lg font-extrabold">Categories</span>
          <button type="button" aria-label="Close" onClick={close}><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul>
            {categories.map((c, i) => (
              <li key={c.slug} className="border-b border-gray-100">
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
                  <span className="flex items-center gap-3"><CategoryIcon name={c.icon} size={18} className="text-brand-deep" /> {c.name}</span>
                  <ChevronDown size={16} className={`transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && (
                  <ul className="bg-gray-50 px-4 pb-3">
                    <li><Link to={`/shop?category=${c.slug}`} className="block py-2 text-sm font-bold text-brand-deep">All {c.name}</Link></li>
                    {(c.children || []).map((x) => x.name).map((s) => (
                      <li key={s}><Link to={`/shop?category=${c.slug}&sub=${encodeURIComponent(s)}`} className="block py-2 text-sm text-gray-600">{s}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 p-4 text-sm font-semibold">
            <Link to="/shop?sort=newest" className="btn-outline">New Arrivals</Link>
            <Link to="/shop?sort=best" className="btn-outline">Best Sellers</Link>
            <Link to="/shop?discount=1" className="btn-outline">Special Offers</Link>
            <Link to="/contact" className="btn-outline">Contact</Link>
            <Link to="/compare" className="btn-outline"><Scale size={16} /> Compare</Link>
            <Link to="/wishlist" className="btn-outline"><Heart size={16} /> Wishlist</Link>
            <Link to="/order-tracking" className="btn-outline col-span-2">Track an order</Link>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-4">
          <Link to={user ? '/account' : '/login'} className="btn-primary flex-1"><User size={16} /> {user ? 'My account' : 'Sign in'}</Link>
          <CurrencySwitcher />
        </div>
      </div>
    </div>
  )
}
