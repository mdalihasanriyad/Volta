import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ExternalLink, LogOut, Menu, X, Zap } from 'lucide-react'
import { useAdminAuth } from '../store'
import PageLoader from '../../components/ui/PageLoader'
import { canAccess, isSuper, modules } from '../permissions'
import { AdminToaster } from './Ui'

export default function AdminLayout() {
  const { admin, ready, init, logout } = useAdminAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const nav = useNavigate()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { document.title = 'Volta Admin' }, [])
  useEffect(() => { if (!ready) init() }, [ready, init])

  if (!ready) return <PageLoader />
  if (!admin) return <Navigate to="/admin/login" replace />

  const visible = modules.filter((m) => canAccess(admin, m))
  const groups = [...new Set(visible.map((m) => m.group))]

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col overflow-y-auto bg-ink text-gray-300">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-extrabold text-white"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink"><Zap size={18} fill="currentColor" /></span> Volta Admin</div>
      <div className="flex-1 space-y-5 px-3 pb-6">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 px-3 text-xs font-bold text-gray-500">{g}</p>
            {visible.filter((m) => m.group === g).map((m) => (
              <NavLink key={m.id} to={m.path} end={m.path === '/admin'} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-deep text-white' : 'hover:bg-white/10'}`}><m.icon size={17} /> {m.label}</NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}<button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-4 text-white"><X size={20} /></button></div>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="lg:hidden"><Menu size={22} /></button>
          <div className="flex-1" />
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSuper(admin) ? 'bg-ink text-white' : 'bg-brand-soft text-brand-deep'}`}>{isSuper(admin) ? 'Super Admin' : 'Admin'}</span>
          <span className="hidden text-sm font-semibold sm:block">{admin.name}</span>
          <Link to="/admin/notifications" aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100"><Bell size={19} /></Link>
          <a href="/" target="_blank" rel="noreferrer" aria-label="View store" className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-gray-100 sm:grid"><ExternalLink size={18} /></a>
          <button type="button" aria-label="Sign out" onClick={async () => { await logout(); nav('/admin/login') }} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100"><LogOut size={18} /></button>
        </header>
        <main className="p-4 lg:p-6"><Outlet /></main>
      </div>
      <AdminToaster />
    </div>
  )
}
