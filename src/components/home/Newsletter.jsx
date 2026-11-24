import { useForm } from 'react-hook-form'
import { useUI } from '../../store'
import { api, errMsg } from '../../services/api'

export default function Newsletter() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const notify = useUI((s) => s.notify)
  const onSubmit = async (d) => {
    try { await api.post('/catalog/newsletter', { email: d.email }); notify('Subscribed. Check your inbox soon.'); reset() } catch (e) { notify(errMsg(e)) }
  }
  return (
    <section className="container-x py-8">
      <div className="grid items-center gap-4 rounded-2xl bg-brand-soft p-6 md:grid-cols-2 md:p-10">
        <div>
          <h2 className="text-xl font-extrabold md:text-2xl">Get new arrivals and offers first</h2>
          <p className="mt-1 text-sm text-gray-600">One email a week. Unsubscribe any time.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="nl-email">Email address</label>
            <input id="nl-email" type="email" placeholder="you@example.com" className="input" {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
            <button className="btn-dark shrink-0" type="submit" disabled={isSubmitting}>Subscribe</button>
          </div>
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </form>
      </div>
    </section>
  )
}
