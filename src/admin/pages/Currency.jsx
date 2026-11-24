import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../components/DataTable'
import { ConfirmModal, Modal, PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg, fieldErrors } from '../../services/api'
import { useAdminToast } from '../store'

export default function Currency() {
  const { data, error, reload } = useFetch(() => api.get('/admin/currencies').then((r) => r.data), [])
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const notify = useAdminToast((s) => s.notify)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { decimals: 2 } })

  const patch = async (c, body, ok) => { try { await api.patch(`/admin/currencies/${c._id}`, body); notify(ok); reload() } catch (e) { notify(errMsg(e)) } }
  const add = async (d) => {
    try { await api.post('/admin/currencies', { code: d.code, name: d.name, symbol: d.symbol, rate: Number(d.rate), decimals: Number(d.decimals) }); notify('Currency added'); setAdding(false); reset(); reload() }
    catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); setError('root', { message: errMsg(e) }) }
  }
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  return (
    <>
      <PageHeader title="Currency" subtitle="Prices are stored in BDT. Display prices use the rates below, which only you set. Past orders keep the rate they were placed with.">
        <button type="button" className="btn-primary" onClick={() => setAdding(true)}>Add currency</button>
      </PageHeader>
      <DataTable rows={data.map((c) => ({ ...c, id: c._id }))} columns={[
        { key: 'code', label: 'Code', render: (c) => <span className="font-bold">{c.code}{c.isBase ? ' (base)' : ''}</span> }, { key: 'name', label: 'Name' }, { key: 'symbol', label: 'Symbol' },
        { key: 'rate', label: '1 BDT equals', render: (c) => c.isBase ? '1' : <span className="flex items-center gap-2"><input aria-label={`${c.code} rate`} type="number" step="any" defaultValue={c.rate} onBlur={(e) => Number(e.target.value) !== c.rate && patch(c, { rate: Number(e.target.value) }, 'Rate saved')} className="input !w-32 !py-1.5" /> {c.code}</span> },
        { key: 'isActive', label: 'Enabled', render: (c) => c.isBase ? 'Always' : <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={c.isActive} onChange={(e) => patch(c, { isActive: e.target.checked }, e.target.checked ? 'Currency enabled' : 'Currency disabled')} /> On</label> },
        { key: 'isDefault', label: 'Default', render: (c) => c.isDefault ? <span className="chip bg-brand-soft text-brand-deep">Default</span> : <button type="button" disabled={!c.isActive} className="text-sm font-semibold text-brand-deep disabled:opacity-40" onClick={() => patch(c, { isDefault: true }, 'Default currency saved')}>Make default</button> },
      ]} actions={(c) => !c.isBase && !c.isDefault ? <button type="button" className="btn-outline !py-1.5 !text-xs !text-red-600" onClick={() => setDeleting(c)}>Delete</button> : null} />
      {data.length === 1 && <p className="mt-4 rounded-lg bg-gray-100 p-4 text-sm text-gray-600">Only BDT exists. To accept USD or others, add the currency with a rate you trust. The storefront shows a currency selector once there are two or more.</p>}
      {adding && (
        <Modal title="Add currency" onClose={() => setAdding(false)}>
          <form onSubmit={handleSubmit(add)} noValidate className="space-y-4">
            <div><label htmlFor="cc" className="label">Code (3 letters)</label><input id="cc" maxLength={3} className="input" {...register('code', { required: 'Enter a currency code', pattern: { value: /^[A-Za-z]{3}$/, message: 'Use exactly 3 letters' } })} />{errors.code && <p className="field-error">{errors.code.message}</p>}</div>
            <div><label htmlFor="cn2" className="label">Name</label><input id="cn2" className="input" {...register('name', { required: 'Enter a name' })} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="cs2" className="label">Symbol</label><input id="cs2" className="input" {...register('symbol', { required: 'Enter a symbol' })} />{errors.symbol && <p className="field-error">{errors.symbol.message}</p>}</div>
              <div><label htmlFor="cd" className="label">Decimals</label><input id="cd" type="number" min="0" max="4" className="input" {...register('decimals')} /></div>
            </div>
            <div><label htmlFor="cr" className="label">Rate: 1 BDT equals</label><input id="cr" type="number" step="any" className="input" {...register('rate', { required: 'Enter the rate', min: { value: 0.000001, message: 'Rate must be greater than zero' } })} />{errors.rate && <p className="field-error">{errors.rate.message}</p>}</div>
            {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setAdding(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={isSubmitting}>Add currency</button></div>
          </form>
        </Modal>
      )}
      {deleting && <ConfirmModal title="Delete currency" text={`Delete ${deleting.code}? Currencies used by past orders cannot be deleted; disable them instead.`} onClose={() => setDeleting(null)} onConfirm={async () => { try { await api.delete(`/admin/currencies/${deleting._id}`); notify('Currency deleted'); reload() } catch (e) { notify(errMsg(e)) } setDeleting(null) }} />}
    </>
  )
}
