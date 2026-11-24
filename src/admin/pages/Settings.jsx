import { useForm } from 'react-hook-form'
import { PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg } from '../../services/api'
import { useAdminToast } from '../store'

function Form({ settings, onSaved }) {
  const notify = useAdminToast((s) => s.notify)
  const store = useForm({ defaultValues: { storeName: settings.storeName || '', email: settings.email || '', phone: settings.phone || '', address: settings.address || '', lowStockThreshold: settings.lowStockThreshold ?? 8, maintenance: !!settings.maintenance } })
  const sec = useForm({ defaultValues: { sessionMinutes: settings.security?.sessionMinutes ?? 60, maxFailedLogins: settings.security?.maxFailedLogins ?? 5, } })
  const saveStore = async (d) => { try { await api.put('/admin/settings', { storeName: d.storeName, email: d.email || undefined, phone: d.phone, address: d.address, lowStockThreshold: Number(d.lowStockThreshold), maintenance: !!d.maintenance }); notify('Store settings saved'); onSaved() } catch (e) { notify(errMsg(e)) } }
  const saveSec = async (d) => { try { await api.put('/admin/settings', { security: { sessionMinutes: Number(d.sessionMinutes), maxFailedLogins: Number(d.maxFailedLogins) } }); notify('Security settings saved'); onSaved() } catch (e) { notify(errMsg(e)) } }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={store.handleSubmit(saveStore)} className="card space-y-4 p-5">
        <h2 className="font-extrabold">Store</h2>
        <div><label htmlFor="sn" className="label">Store name</label><input id="sn" className="input" {...store.register('storeName', { required: true })} /></div>
        <div><label htmlFor="se" className="label">Support email</label><input id="se" type="email" className="input" {...store.register('email')} /></div>
        <div><label htmlFor="sp" className="label">Phone</label><input id="sp" className="input" {...store.register('phone')} /></div>
        <div><label htmlFor="sa" className="label">Address</label><input id="sa" className="input" {...store.register('address')} /></div>
        <div><label htmlFor="sl" className="label">Default low-stock threshold</label><input id="sl" type="number" min="0" className="input" {...store.register('lowStockThreshold')} /></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" {...store.register('maintenance')} /> Maintenance mode (hides the storefront)</label>
        <button className="btn-primary" type="submit" disabled={store.formState.isSubmitting}>Save store settings</button>
      </form>
      <form onSubmit={sec.handleSubmit(saveSec)} className="card space-y-4 p-5">
        <h2 className="font-extrabold">Security</h2>
        <div><label htmlFor="st" className="label">Admin idle timeout (minutes)</label><input id="st" type="number" min="5" className="input" {...sec.register('sessionMinutes')} /></div>
        <div><label htmlFor="sr" className="label">Failed logins before an admin is locked out</label><input id="sr" type="number" min="3" max="20" className="input" {...sec.register('maxFailedLogins')} /></div>
        <p className="text-xs text-gray-500">Admins who are inactive for longer than the session length are signed out (checked every 15 minutes, so the effective minimum is about 15). Admin passwords must always have 8+ characters with a letter and a number.</p>
        <button className="btn-primary" type="submit" disabled={sec.formState.isSubmitting}>Save security settings</button>
      </form>
    </div>
  )
}

export default function Settings() {
  const { data, error, reload } = useFetch(() => api.get('/admin/settings').then((r) => r.data), [])
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  return <><PageHeader title="Settings" subtitle="Store details and security (Super Admin only)." /><Form settings={data} onSaved={reload} /></>
}
