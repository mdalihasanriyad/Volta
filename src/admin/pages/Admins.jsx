import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, ShieldOff } from 'lucide-react'
import DataTable from '../components/DataTable'
import { Badge, ConfirmModal, Modal, PageHeader } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg, fieldErrors } from '../../services/api'
import { assignable } from '../permissions'
import { useAdminToast } from '../store'

function PermBoxes({ value, onChange }) {
  return (
    <fieldset>
      <legend className="label">Permissions</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {assignable.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} /> {l}</label>)}
      </div>
      <p className="mt-2 text-xs text-gray-500">Financial reports, coupons, shipping, currency, SEO, content, settings, admin management and logs are always Super Admin only.</p>
    </fieldset>
  )
}

export default function Admins() {
  const { data, error, reload } = useFetch(() => api.get('/admin/admins').then((r) => r.data), [])
  const notify = useAdminToast((s) => s.notify)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [perms, setPerms] = useState([])
  const [confirm, setConfirm] = useState(null)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm()

  const patch = async (id, body, ok) => { try { await api.patch(`/admin/admins/${id}`, body); notify(ok); reload() } catch (e) { notify(errMsg(e)) } }
  const add = async (d) => {
    try { await api.post('/admin/admins', { name: d.name, email: d.email, password: d.password, permissions: perms }); notify('Admin created. Share the password with them securely.'); setCreating(false); setPerms([]); reset(); reload() }
    catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); setError('root', { message: errMsg(e) }) }
  }
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data) return <PageLoader />
  return (
    <>
      <PageHeader title="Admin management" subtitle="Only Super Admins can create admins or change permissions. Changes apply on the admin's very next request.">
        <button type="button" className="btn-primary" onClick={() => { setPerms(['orders']); setCreating(true) }}><Plus size={16} /> New admin</button>
      </PageHeader>
      <DataTable rows={data.map((a) => ({ ...a, id: a._id }))} columns={[
        { key: 'name', label: 'Name', render: (a) => <span className="font-bold">{a.name}</span> }, { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (a) => (a.role === 'super_admin' ? 'Super Admin' : 'Admin') },
        { key: 'status', label: 'Status', render: (a) => <Badge>{a.status === 'active' ? 'Active' : 'Suspended'}</Badge> },
        { key: 'permissions', label: 'Permissions', render: (a) => <span className="text-xs text-gray-600">{a.role === 'super_admin' ? 'Everything' : a.permissions.length ? a.permissions.join(', ') : 'None'}</span> },
        { key: 'lastLoginAt', label: 'Last login', render: (a) => (a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : '–') },
      ]} actions={(a) => a.role === 'super_admin' ? null : (<>
        <button type="button" className="btn-outline !py-1.5 !text-xs" onClick={() => { setPerms(a.permissions); setEditing(a) }}>Permissions</button>
        <button type="button" className="btn-outline !py-1.5 !text-xs" onClick={() => patch(a._id, { permissions: [] }, 'All permissions revoked')}><ShieldOff size={13} /> Revoke all</button>
        <button type="button" className="btn-outline !py-1.5 !text-xs" onClick={() => setConfirm(a)}>{a.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
      </>)} />
      {creating && (
        <Modal title="Create admin" onClose={() => setCreating(false)} wide>
          <form onSubmit={handleSubmit(add)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="an" className="label">Full name</label><input id="an" className="input" {...register('name', { required: 'Enter a name' })} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
              <div><label htmlFor="ae2" className="label">Email</label><input id="ae2" type="email" className="input" {...register('email', { required: 'Enter an email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
              <div className="sm:col-span-2"><label htmlFor="apw" className="label">Initial password</label><input id="apw" type="password" autoComplete="new-password" className="input" {...register('password', { required: 'Set a password', minLength: { value: 8, message: 'Use at least 8 characters' } })} />{errors.password && <p className="field-error">{errors.password.message}</p>}<p className="mt-1 text-xs text-gray-500">8+ characters with a letter and a number. Ask them to change it after the first sign-in.</p></div>
            </div>
            <PermBoxes value={perms} onChange={setPerms} />
            {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setCreating(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={isSubmitting}>Create admin</button></div>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title={`Permissions: ${editing.name}`} onClose={() => setEditing(null)} wide>
          <PermBoxes value={perms} onChange={setPerms} />
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="btn-primary" onClick={async () => { await patch(editing._id, { permissions: perms }, 'Permissions saved'); setEditing(null) }}>Save permissions</button></div>
        </Modal>
      )}
      {confirm && <ConfirmModal title={`${confirm.status === 'active' ? 'Suspend' : 'Reactivate'} admin`} text={confirm.status === 'active' ? `${confirm.name} will be signed out and lose access immediately.` : `${confirm.name} will be able to sign in again.`} confirmLabel={confirm.status === 'active' ? 'Suspend' : 'Reactivate'} onClose={() => setConfirm(null)} onConfirm={async () => { await patch(confirm._id, { status: confirm.status === 'active' ? 'suspended' : 'active' }, 'Admin updated'); setConfirm(null) }} />}
    </>
  )
}
