import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone, Zap } from 'lucide-react'
import { useCatalog } from '../../store/catalog'

const cols = [
  { title: 'Shop', items: [['All products', '/shop'], ['New arrivals', '/shop?sort=newest'], ['Best sellers', '/shop?sort=best'], ['Special offers', '/shop?discount=1']] },
  { title: 'Customer care', items: [['Track an order', '/order-tracking'], ['My account', '/account'], ['Compare products', '/compare'], ['Contact us', '/contact']] },
  { title: 'Policies', items: [['Delivery information', '/contact'], ['Returns and refunds', '/contact'], ['Warranty', '/contact'], ['Privacy policy', '/contact']] },
]

export default function Footer() {
  const st = useCatalog((s) => s.settings)
  return (
    <footer className="hidden bg-ink text-gray-300 md:block">
      <div className="container-x grid gap-10 py-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink"><Zap size={18} fill="currentColor" /></span> {st.storeName || 'Volta'}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6">Genuine gadgets with official warranty. Order online and pay with Cash on Delivery.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {st.address && <li className="flex items-center gap-2"><MapPin size={16} className="text-brand" /> {st.address}</li>}
            {st.phone && <li className="flex items-center gap-2"><Phone size={16} className="text-brand" /> {st.phone}</li>}
            {st.email && <li className="flex items-center gap-2"><Mail size={16} className="text-brand" /> {st.email}</li>}
          </ul>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-bold text-white">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.items.map(([label, to]) => <li key={label}><Link to={to} className="hover:text-brand">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">© 2026 {st.storeName || 'Volta'}. All rights reserved. Prices shown in the selected currency; orders are billed in BDT.</div>
    </footer>
  )
}
