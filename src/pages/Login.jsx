import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import GoogleSignIn from '../components/ui/GoogleSignIn'
import { errMsg } from '../services/api'
import { useAuth } from '../store'

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const { login, google } = useAuth()
  const [error, setError] = useState('')
  const nav = useNavigate()
  const { state } = useLocation()
  const go = () => nav(state?.from || '/account', { replace: true })

  const onSubmit = async (d) => { setError(''); try { await login(d.email, d.password); go() } catch (e) { setError(errMsg(e)) } }
  const onGoogle = async (credential) => { setError(''); try { await google(credential); go() } catch (e) { setError(errMsg(e)) } }

  return (
    <div className="container-x grid place-items-center py-10">
      <div className="card w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-extrabold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">{state?.from === '/checkout' ? 'Sign in to place your order. Guest checkout is not available.' : 'Welcome back.'}</p>
        <div className="mt-6"><GoogleSignIn onCredential={onGoogle} /></div>
        <p className="my-4 text-center text-xs text-gray-400">or use your email</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between"><label htmlFor="password" className="label">Password</label><Link to="/forgot-password" className="text-xs font-semibold text-brand-deep">Forgot password?</Link></div>
            <input id="password" type="password" autoComplete="current-password" className="input" {...register('password', { required: 'Enter your password' })} />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">New to Volta? <Link to="/register" state={state} className="font-bold text-brand-deep">Create an account</Link></p>
      </div>
    </div>
  )
}
