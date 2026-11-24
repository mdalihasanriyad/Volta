import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import DataTable from './DataTable'
import ImageUploader from './ImageUploader'
import { ConfirmModal, Modal, PageHeader } from './Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg, fieldErrors } from '../../services/api'
import { useAdminToast } from '../store'

const cap = (s) => s[0].toUpperCase() + s.slice(1)

function RowForm({ fields, row, noun, onSave, onClose, trash }) {
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: row })
  const submit = async (values) => {
    fields.forEach((f) => { if (f.type === 'number' && values[f.name] !== '' && values[f.name] != null) values[f.name] = Number(values[f.name]) })
    try { await onSave(values) } catch (e) {
      const fe = fieldErrors(e)
      Object.entries(fe).forEach(([k, m]) => setError(k.split('.')[0], { message: m }))
      setError('root', { message: errMsg(e) })
    }
  }
  return (
    <Modal title={row._id ? `Edit ${noun}` : `New ${noun}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.type === 'textarea' || f.type === 'image' ? 'sm:col-span-2' : ''}>
            {f.type === 'checkbox' ? (
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" {...register(f.name)} /> {f.label}</label>
            ) : f.type === 'image' ? (
              <><span className="label">{f.label}</span><Controller name={f.name} control={control} render={({ field }) => <ImageUploader value={field.value} onChange={field.onChange} folder={f.folder} onRemoved={(id) => trash.current.push(id)} />} /></>
            ) : (
              <>
                <label htmlFor={'f-' + f.name} className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select id={'f-' + f.name} className="input" {...register(f.name)}>{f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? (o || 'None')}</option>)}</select>
                ) : f.type === 'textarea' ? (
                  <textarea id={'f-' + f.name} rows={3} className="input" {...register(f.name)} />
                ) : (
                  <input id={'f-' + f.name} type={f.type || 'text'} step={f.type === 'number' ? 'any' : undefined} readOnly={f.readOnly} className="input" {...register(f.name, { required: f.required ? `${f.label} is required` : false, min: f.type === 'number' && f.min !== undefined ? { value: f.min, message: `${f.label} cannot be below ${f.min}` } : undefined })} />
                )}
                {f.help && <p className="mt-1 text-xs text-gray-500">{f.help}</p>}
              </>
            )}
            {errors[f.name] && <p className="field-error">{errors[f.name].message}</p>}
          </div>
        ))}
        {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : `Save ${noun}`}</button></div>
      </form>
    </Modal>
  )
}

// A complete list/create/edit/delete screen backed by one admin API endpoint.
export default function ResourcePage({
  title, subtitle, noun, endpoint, columns, fields, toForm = (d) => d, toPayload = (v) => v, nameKey = 'name',
  allowCreate = true, allowEdit = true, allowDelete = true, rowActions = [], filters, defaults = {}, paged = false, lookups = false,
}) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('All')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const trash = useRef([])
  const notify = useAdminToast((s) => s.notify)

  const list = useFetch(() => api.get(endpoint, { params: paged ? { page, limit: 20, q: q || undefined } : undefined }).then((r) => r.data), [endpoint, paged ? page : 0, paged ? q : ''])
  const ctx = useFetch(() => (lookups ? api.get('/admin/lookups').then((r) => r.data) : Promise.resolve({})), [lookups])

  if (list.error) return <><PageHeader title={title} subtitle={subtitle} /><ErrorBox error={list.error} onRetry={list.reload} /></>
  if (list.loading && !list.data) return <PageLoader />
  const rows = (Array.isArray(list.data) ? list.data : list.data?.items || []).map((d) => ({ ...d, id: d._id }))
  const shown = rows.filter((r) => (!filters || filter === 'All' || String(r[filters.key]) === filter) && (paged || !q || JSON.stringify(Object.values(r)).toLowerCase().includes(q.toLowerCase())))
  const formFields = typeof fields === 'function' ? fields(ctx.data || {}) : fields

  const save = async (values) => {
    const body = toPayload(values)
    if (editing._id) await api.patch(`${endpoint}/${editing._id}`, body)
    else await api.post(endpoint, body)
    // images that were removed or replaced are deleted from Cloudinary only after the record is saved
    trash.current.splice(0).forEach((id) => api.post('/admin/uploads/delete', { publicId: id }).catch(() => {}))
    notify(`${cap(noun)} ${editing._id ? 'saved' : 'created'}`)
    setEditing(null); list.reload()
  }
  const remove = async () => {
    try { await api.delete(`${endpoint}/${deleting._id}`); notify(`${cap(noun)} deleted`); list.reload() } catch (e) { notify(errMsg(e)) }
    setDeleting(null)
  }
  const patch = async (row, a) => { try { await api.patch(`${endpoint}/${row._id}`, a.patch); notify(`${a.label} done`); list.reload() } catch (e) { notify(errMsg(e)) } }
  const hasActions = allowEdit || allowDelete || rowActions.length > 0

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {allowCreate && <button type="button" className="btn-primary" onClick={() => { trash.current = []; setEditing({ ...defaults }) }}><Plus size={16} /> New {noun}</button>}
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="rp-search">Search {title}</label>
        <input id="rp-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder={`Search ${title.toLowerCase()}`} className="input max-w-xs" />
        {filters && <select aria-label={`Filter by ${filters.label}`} value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-[200px]">{['All', ...filters.options].map((o) => <option key={o}>{o}</option>)}</select>}
        {list.loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>
      <DataTable
        columns={columns} rows={shown}
        server={paged && list.data ? { page: list.data.page, pages: list.data.pages, total: list.data.total, onPage: setPage } : undefined}
        actions={hasActions ? (r) => (
          <>
            {rowActions.filter((a) => !a.when || a.when(r)).map((a) => <button key={a.label} type="button" onClick={() => patch(r, a)} className="btn-outline !px-2.5 !py-1.5 !text-xs">{a.label}</button>)}
            {allowEdit && <button type="button" aria-label={`Edit ${r[nameKey]}`} onClick={() => { trash.current = []; setEditing(toForm(r)) }} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-brand-deep hover:text-brand-deep"><Pencil size={14} /></button>}
            {allowDelete && <button type="button" aria-label={`Delete ${r[nameKey]}`} onClick={() => setDeleting(r)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-red-500 hover:text-red-600"><Trash2 size={14} /></button>}
          </>
        ) : undefined}
      />
      {editing && <RowForm fields={formFields} row={editing} noun={noun} onSave={save} onClose={() => setEditing(null)} trash={trash} />}
      {deleting && <ConfirmModal title={`Delete ${noun}`} text={`Delete “${deleting[nameKey]}”? This cannot be undone.`} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </>
  )
}
