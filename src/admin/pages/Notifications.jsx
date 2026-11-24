import { Link } from 'react-router-dom'
import { PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { useAdminToast } from '../store'

export default function Notifications() {
  const { data, error, reload } = useFetch(() => api.get('/admin/notifications').then((r) => r.data), [])
  const notify = useAdminToast((s) => s.notify)
  const mark = async (id) => { try { await api.patch(`/admin/notifications/${id}/read`); reload() } catch (e) { notify(errMsg(e)) } }
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  return (
    <>
      <PageHeader title="Notifications" subtitle="New orders, low stock, return requests, contact messages and system events.">
        <button type="button" className="btn-outline" onClick={() => mark('all')}>Mark all as read</button>
      </PageHeader>
      {data.length === 0 ? <p className="card p-8 text-center text-sm text-gray-500">No notifications yet.</p> : (
        <ul className="card divide-y divide-gray-100">
          {data.map((n) => (
            <li key={n._id} className={`flex items-center gap-3 p-4 ${n.read ? '' : 'bg-brand-soft/40'}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-deep'}`} aria-label={n.read ? 'Read' : 'Unread'} />
              <span className="flex-1 text-sm"><span className="font-semibold">{n.message}</span><span className="block text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</span></span>
              <span className="chip">{n.type}</span>
              {n.link && <Link to={n.link} className="text-sm font-semibold text-brand-deep">Open</Link>}
              {!n.read && <button type="button" className="text-sm font-semibold text-brand-deep" onClick={() => mark(n._id)}>Mark read</button>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
