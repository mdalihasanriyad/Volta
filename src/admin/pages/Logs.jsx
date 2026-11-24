import { useState } from 'react'
import { Download } from 'lucide-react'
import DataTable from '../components/DataTable'
import { PageHeader, downloadCsv } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api } from '../../services/api'

export default function Logs() {
  const [page, setPage] = useState(1)
  const { data, error, reload } = useFetch(() => api.get('/admin/logs', { params: { page, limit: 50 } }).then((r) => r.data), [page])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const rows = data.items.map((l) => ({ ...l, id: l._id }))
  return (
    <>
      <PageHeader title="Activity logs" subtitle="Every change made in the admin is recorded with who did it and when.">
        <button type="button" className="btn-outline" onClick={() => downloadCsv('activity-logs.csv', rows.map((l) => ({ when: l.createdAt, admin: l.adminName, action: l.action, ip: l.ip })))}><Download size={16} /> Export this page</button>
      </PageHeader>
      <DataTable rows={rows} server={{ page: data.page, pages: data.pages, total: data.total, onPage: setPage }} columns={[{ key: 'createdAt', label: 'When', render: (l) => new Date(l.createdAt).toLocaleString() }, { key: 'adminName', label: 'Admin' }, { key: 'action', label: 'Action' }, { key: 'ip', label: 'IP' }]} />
    </>
  )
}
