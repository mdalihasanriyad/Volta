import { NavLink } from 'react-router-dom'
import { Heart, Home, LayoutGrid, Store, User } from 'lucide-react'
import { useUI, useWishlist } from '../../store'

const base = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold'

export default function BottomNav() {
  const setDrawer = useUI((s) => s.setDrawer)
  const wish = useWishlist((s) => s.ids.length)
  const cls = ({ isActive }) => `${base} ${isActive ? 'text-brand-deep' : 'text-gray-500'}`
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <NavLink to="/" end className={cls}><Home size={21} /> Home</NavLink>
      <NavLink to="/shop" className={cls}><Store size={21} /> Shop</NavLink>
      <button type="button" onClick={() => setDrawer(true)} className={`${base} text-gray-500`}><LayoutGrid size={21} /> Categories</button>
      <NavLink to="/wishlist" className={cls}>
        <span className="relative"><Heart size={21} />{wish > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-deep px-1 text-[9px] text-white">{wish}</span>}</span> Wishlist
      </NavLink>
      <NavLink to="/account" className={cls}><User size={21} /> Account</NavLink>
    </nav>
  )
}
