import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShieldCheck, Zap } from 'lucide-react'
import { errMsg } from '../../services/api'
import { useAdminAuth } from '../store'

export default function AdminLogin() {
  const { admin, ready, init, login } = useAdminAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  useEffect(() => { if (!ready) init() }, [ready, init])
  if (admin) return <Navigate to="/admin" replace />

  const onSubmit = async (d) => { setError(''); try { await login(d.email, d.password); nav('/admin') } catch (e) { setError(errMsg(e)) } }
  return (
    <div className="grid min-h-screen place-items-center bg-gray-100 p-4">
      <div className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2 text-xl font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-brand"><Zap size={18} fill="currentColor" /></span> Volta Admin</div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck size={22} className="text-brand-deep" /> Admin sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Admin accounts are created by a Super Admin. There is no public sign up.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          <div><label htmlFor="ae" className="label">Email</label><input id="ae" type="email" autoComplete="username" className="input" {...register('email', { required: 'Enter your email' })} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
          <div><label htmlFor="ap" className="label">Password</label><input id="ap" type="password" autoComplete="current-password" className="input" {...register('password', { required: 'Enter your password' })} />{errors.password && <p className="field-error">{errors.password.message}</p>}</div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}
