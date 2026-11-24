import { Link } from 'react-router-dom'
import { useAdminAuth } from '../store'
import { canAccess, modules } from '../permissions'

export function Guard({ id, children }) {
  const admin = useAdminAuth((s) => s.admin)
  const m = modules.find((x) => x.id === id)
  if (canAccess(admin, m)) return children
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-extrabold">You do not have access to {m.label}</h1>
      <p className="mt-2 text-sm text-gray-500">Ask a Super Admin to grant this permission. In the live system the server also rejects these requests.</p>
      <Link to="/admin" className="btn-primary mt-6">Back to dashboard</Link>
    </div>
  )
}
