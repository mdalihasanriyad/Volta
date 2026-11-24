import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { useAdminToast } from '../store'

export default function Content() {
  const { data, error, reload } = useFetch(() => api.get('/admin/settings').then((r) => r.data), [])
  const [sections, setSections] = useState(null)
  const [announcement, setAnnouncement] = useState(null)
  const [busy, setBusy] = useState(false)
  const notify = useAdminToast((s) => s.notify)
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  const list = sections ?? data.homepageSections ?? []
  const text = announcement ?? data.announcement ?? ''
  const move = (i, d) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setSections(n) }
  const save = async () => {
    setBusy(true)
    try { await api.put('/admin/settings', { homepageSections: list, announcement: text }); notify('Homepage layout saved'); setSections(null); setAnnouncement(null); reload() } catch (e) { notify(errMsg(e)) }
    setBusy(false)
  }
  return (
    <>
      <PageHeader title="Homepage content" subtitle="Control which sections appear on the homepage and in what order."><button type="button" className="btn-primary" onClick={save} disabled={busy}>Save layout</button></PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {list.length === 0 ? <p className="card p-6 text-sm text-gray-500">No sections are configured yet. Run <code>npm run seed</code> to create the default layout.</p> : (
          <ul className="card divide-y divide-gray-100">
            {list.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center text-sm font-bold text-gray-400">{i + 1}</span>
                <span className={`flex-1 text-sm font-semibold ${s.visible ? '' : 'text-gray-400 line-through'}`}>{s.label}</span>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={s.visible} onChange={(e) => setSections(list.map((x) => (x.key === s.key ? { ...x, visible: e.target.checked } : x)))} /> Visible</label>
                <button type="button" aria-label={`Move ${s.label} up`} disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label={`Move ${s.label} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 disabled:opacity-30"><ArrowDown size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        <section className="card h-fit p-5">
          <h2 className="font-extrabold">Announcement bar</h2>
          <label htmlFor="ann" className="label mt-3">Message (leave empty to hide)</label>
          <textarea id="ann" rows={3} maxLength={200} className="input" value={text} onChange={(e) => setAnnouncement(e.target.value)} />
          <p className="mt-2 text-xs text-gray-500">Featured products are chosen on the Products page, featured categories and brands on their own pages, and banner images under Banners.</p>
        </section>
      </div>
    </>
  )
}
