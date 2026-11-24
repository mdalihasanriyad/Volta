import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { CheckCircle2, XCircle } from 'lucide-react'
import PageLoader from '../components/ui/PageLoader'
import { api, errMsg } from '../services/api'
import { useAuth } from '../store'

const Shell = ({ title, children }) => (
  <div className="container-x grid place-items-center py-10"><div className="card w-full max-w-md p-6 md:p-8"><h1 className="mb-4 text-2xl font-extrabold">{title}</h1>{children}</div></div>
)

export function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const onSubmit = async (d) => { setError(''); try { await api.post('/auth/forgot-password', { email: d.email }); setSent(true) } catch (e) { setError(errMsg(e)) } }
  return (
    <Shell title="Forgot your password?">
      {sent ? <p className="text-sm text-gray-600">If an account exists for that email, a reset link is on its way. The link works for one hour.</p> : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <p className="text-sm text-gray-500">Enter your email and we will send you a link to choose a new password.</p>
          <div><label htmlFor="fe" className="label">Email</label><input id="fe" type="email" className="input" {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>Send reset link</button>
        </form>
      )}
      <Link to="/login" className="mt-5 block text-center text-sm font-semibold text-brand-deep">Back to sign in</Link>
    </Shell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const [state, setState] = useState({ done: false, error: '' })
  const onSubmit = async (d) => { try { await api.post('/auth/reset-password', { token, password: d.password }); setState({ done: true, error: '' }) } catch (e) { setState({ done: false, error: errMsg(e) }) } }
  if (!token) return <Shell title="Reset link missing"><p className="text-sm text-gray-600">Open the link from your email, or <Link to="/forgot-password" className="font-bold text-brand-deep">request a new one</Link>.</p></Shell>
  return (
    <Shell title="Choose a new password">
      {state.done ? <><p className="text-sm text-gray-600">Your password was updated.</p><Link to="/login" className="btn-primary mt-4 w-full">Sign in</Link></> : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div><label htmlFor="np" className="label">New password</label><input id="np" type="password" autoComplete="new-password" className="input" {...register('password', { required: 'Enter a new password', minLength: { value: 8, message: 'Use at least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />{errors.password && <p className="field-error">{errors.password.message}</p>}</div>
          <div><label htmlFor="rp" className="label">Repeat password</label><input id="rp" type="password" autoComplete="new-password" className="input" {...register('repeat', { validate: (v) => v === watch('password') || 'Passwords do not match' })} />{errors.repeat && <p className="field-error">{errors.repeat.message}</p>}</div>
          {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>Update password</button>
        </form>
      )}
    </Shell>
  )
}

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const refreshUser = useAuth((s) => s.refreshUser)
  const [state, setState] = useState({ loading: !!token, ok: false, error: '' })
  useEffect(() => {
    if (!token) return
    api.post('/auth/verify-email', { token }).then(() => { setState({ loading: false, ok: true, error: '' }); refreshUser() }).catch((e) => setState({ loading: false, ok: false, error: errMsg(e) }))
  }, [token, refreshUser])
  if (state.loading) return <PageLoader />
  return (
    <Shell title={state.ok ? 'Email verified' : 'Verification'}>
      {state.ok ? <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={18} /> Your email address is confirmed. You can place orders now.</p>
        : <p className="flex items-start gap-2 text-sm text-red-700"><XCircle size={18} className="mt-0.5 shrink-0" /> {state.error || 'Open the verification link from your email.'}</p>}
      <Link to="/account" className="btn-primary mt-5 w-full">Go to my account</Link>
    </Shell>
  )
}
