import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useAdminToast } from '../store'

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, tone = 'sky' }) {
  const tones = { sky: 'bg-brand-soft text-brand-deep', dark: 'bg-ink text-white', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600', green: 'bg-emerald-50 text-emerald-700' }
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>{Icon && <Icon size={20} />}</span>
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-gray-500">{label}</p><p className="truncate text-xl font-extrabold">{value}</p></div>
    </div>
  )
}

const badgeTones = {
  Active: 'green', Approved: 'green', Delivered: 'green', Paid: 'green', 'Stock in': 'green', Yes: 'green',
  Pending: 'amber', Draft: 'amber', Processing: 'amber', Confirmed: 'sky', Shipped: 'sky', 'Out for Delivery': 'sky', Adjustment: 'amber',
  Cancelled: 'red', Rejected: 'red', Blocked: 'red', Suspended: 'red', Returned: 'red', 'Stock out': 'red', Unpaid: 'amber', No: 'gray',
}
const toneCls = { green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600', sky: 'bg-brand-soft text-brand-deep', gray: 'bg-gray-100 text-gray-600' }
export function Badge({ children }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${toneCls[badgeTones[children] || 'gray']}`}>{children}</span>
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-card ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ title, text, confirmLabel = 'Delete', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-gray-600">{text}</p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>{confirmLabel}</button></div>
    </Modal>
  )
}

export function AdminToaster() {
  const message = useAdminToast((s) => s.message)
  if (!message) return null
  return <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4"><div className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card">{message}</div></div>
}

export function money(n) { return '৳' + Math.round(n || 0).toLocaleString('en-IN') }

export function downloadCsv(filename, rows) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
