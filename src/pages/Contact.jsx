import { useForm } from 'react-hook-form'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { api, errMsg } from '../services/api'
import { useUI } from '../store'
import { useCatalog } from '../store/catalog'

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()
  const notify = useUI((s) => s.notify)
  const st = useCatalog((s) => s.settings)
  const onSubmit = async (d) => { try { const { data } = await api.post('/catalog/contact', d); notify(data.message); reset() } catch (e) { notify(errMsg(e)) } }
  return (
    <>
      <Breadcrumbs items={[{ label: 'Contact' }]} />
      <div className="container-x grid gap-8 pb-12 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-2xl font-extrabold">Contact us</h1>
          <p className="mt-1 text-sm text-gray-500">Questions about an order, warranty or a product? Send a message and we will reply within one working day.</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="cn" className="label">Name</label><input id="cn" className="input" {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Enter your name' } })} />{errors.name && <p className="field-error">{errors.name.message}</p>}</div>
            <div><label htmlFor="ce" className="label">Email</label><input id="ce" type="email" className="input" {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />{errors.email && <p className="field-error">{errors.email.message}</p>}</div>
            <div className="sm:col-span-2"><label htmlFor="cs" className="label">Subject</label><input id="cs" className="input" {...register('subject', { required: 'Enter a subject', minLength: { value: 3, message: 'Enter a subject' } })} />{errors.subject && <p className="field-error">{errors.subject.message}</p>}</div>
            <div className="sm:col-span-2"><label htmlFor="cm" className="label">Message</label><textarea id="cm" rows={5} className="input" {...register('message', { required: 'Write your message', minLength: { value: 10, message: 'Please write at least 10 characters' } })} />{errors.message && <p className="field-error">{errors.message.message}</p>}</div>
            <div className="sm:col-span-2"><button className="btn-primary" type="submit" disabled={isSubmitting}>Send message</button></div>
          </form>
        </div>
        <aside className="card h-fit space-y-4 p-5 text-sm">
          {st.address && <p className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-brand-deep" /> {st.address}</p>}
          {st.phone && <p className="flex items-center gap-3"><Phone size={18} className="text-brand-deep" /> {st.phone}</p>}
          {st.email && <p className="flex items-center gap-3"><Mail size={18} className="text-brand-deep" /> {st.email}</p>}
          <p className="flex items-center gap-3"><Clock size={18} className="text-brand-deep" /> Daily, 10am – 8pm</p>
        </aside>
      </div>
    </>
  )
}
