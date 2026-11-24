import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import GoogleSignIn from '../components/ui/GoogleSignIn'
import { errMsg, fieldErrors } from '../services/api'
import { useAuth, useUI } from '../store'

export default function Register() {
  const { register, handleSubmit, watch, setError: setFieldError, formState: { errors, isSubmitting } } = useForm()
  const { register: signUp, google } = useAuth()
  const notify = useUI((s) => s.notify)
  const [error, setError] = useState('')
  const nav = useNavigate()
  const { state } = useLocation()
  const go = () => nav(state?.from || '/account', { replace: true })

  const onSubmit = async (d) => {
    setError('')
    try { await signUp({ name: d.name, email: d.email, password: d.password }); notify('Account created. Check your email to verify it.'); go() }
    catch (e) { const f = fieldErrors(e); Object.entries(f).forEach(([k, m]) => setFieldError(k, { message: m })); setError(errMsg(e)) }
  }
  const onGoogle = async (credential) => { setError(''); try { await google(credential); go() } catch (e) { setError(errMsg(e)) } }

  return (
    <div className="container-x grid place-items-center py-10">
      <div className="card w-full max-w-md p-6 md:p-8">
        <h1 className="text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Track orders, save addresses and check out faster.</p>
        <div className="mt-6"><GoogleSignIn onCredential={onGoogle} /></div>
        <p className="my-4 text-center text-xs text-gray-400">or use your email</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div><label htmlFor="name" className="label">Full name</label><input id="name" autoComplete="name" className="input" {...register('name', { required: 'Enter your full name', minLength: { value: 2, message: 'Enter your full name' } })} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
          <div><label htmlFor="email" className="label">Email</label><input id="email" type="email" autoComplete="email" className="input" {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
          <div><label htmlFor="password" className="label">Password</label><input id="password" type="password" autoComplete="new-password" className="input" {...register('password', { required: 'Create a password', minLength: { value: 8, message: 'Use at least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />{errors.password && <p className="field-error">{errors.password.message}</p>}</div>
          <div><label htmlFor="confirm" className="label">Confirm password</label><input id="confirm" type="password" autoComplete="new-password" className="input" {...register('confirm', { validate: (v) => v === watch('password') || 'Passwords do not match' })} />{errors.confirm && <p className="field-error">{errors.confirm.message}</p>}</div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-deep" {...register('terms', { required: 'Accept the terms to continue' })} /> I agree to the terms and privacy policy.</label>
          {errors.terms && <p className="field-error">{errors.terms.message}</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">Already have an account? <Link to="/login" state={state} className="font-bold text-brand-deep">Sign in</Link></p>
      </div>
    </div>
  )
}
