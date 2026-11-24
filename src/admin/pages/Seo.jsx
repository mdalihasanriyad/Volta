import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { useAdminToast } from '../store'

export default function Seo() {
  const { data, error, reload } = useFetch(() => api.get('/admin/settings').then((r) => r.data), [])
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)
  const notify = useAdminToast((s) => s.notify)
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const list = rows ?? data.seoPages ?? []
  const set = (i, k, v) => setRows(list.map((r, n) => (n === i ? { ...r, [k]: v } : r)))
  const save = async () => {
    setBusy(true)
    try { await api.put('/admin/settings', { seoPages: list }); notify('SEO saved'); setRows(null); reload() } catch (e) { notify(errMsg(e)) }
    setBusy(false)
  }
  return (
    <>
      <PageHeader title="SEO" subtitle="Meta titles and descriptions for pages and category listings. Product SEO fields use the product name and description by default.">
        <button type="button" className="btn-outline" onClick={() => setRows([...list, { page: '', path: '/', title: '', description: '' }])}><Plus size={16} /> Add page</button>
        <button type="button" className="btn-primary" onClick={save} disabled={busy}>Save SEO</button>
      </PageHeader>
      <div className="space-y-4">
        {list.map((r, i) => (
          <div key={i} className="card grid gap-3 p-4 sm:grid-cols-2">
            <div><label className="label" htmlFor={`sp-${i}`}>Page name</label><input id={`sp-${i}`} className="input" value={r.page} onChange={(e) => set(i, 'page', e.target.value)} /></div>
            <div><label className="label" htmlFor={`su-${i}`}>URL path</label><input id={`su-${i}`} className="input" value={r.path} onChange={(e) => set(i, 'path', e.target.value)} placeholder="/ or /shop?category=laptops" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor={`st-${i}`}>Meta title <span className="font-normal text-gray-500">({r.title.length}/60)</span></label><input id={`st-${i}`} maxLength={120} className="input" value={r.title} onChange={(e) => set(i, 'title', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor={`sd-${i}`}>Meta description <span className="font-normal text-gray-500">({r.description.length}/160)</span></label><textarea id={`sd-${i}`} rows={2} maxLength={300} className="input" value={r.description} onChange={(e) => set(i, 'description', e.target.value)} /></div>
            <button type="button" className="flex items-center gap-1 text-sm font-semibold text-red-600" onClick={() => setRows(list.filter((_, n) => n !== i))}><Trash2 size={14} /> Remove</button>
          </div>
        ))}
        {list.length === 0 && <p className="card p-6 text-sm text-gray-500">No page SEO entries yet. Add one for the homepage with the path “/”.</p>}
      </div>
    </>
  )
}
