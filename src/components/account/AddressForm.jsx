import { useForm } from 'react-hook-form'
import { COUNTRIES } from '../../utils/countries'

export default function AddressForm({ defaults = {}, onSubmit, onCancel, submitLabel = 'Save address', busy = false, showDefault = true }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { country: 'BD', ...defaults } })
  const e = (n) => errors[n] && <p className="field-error">{errors[n].message}</p>
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div><label htmlFor="a-name" className="label">Full name</label><input id="a-name" autoComplete="name" className="input" {...register('fullName', { required: 'Enter the recipient name', minLength: { value: 2, message: 'Enter the recipient name' } })} />{e('fullName')}</div>
      <div><label htmlFor="a-phone" className="label">Phone</label><input id="a-phone" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="input" {...register('phone', { required: 'Enter a phone number we can call', pattern: { value: /^[+\d][\d\s-]{6,19}$/, message: 'Enter a valid phone number' } })} />{e('phone')}</div>
      <div><label htmlFor="a-country" className="label">Country</label><select id="a-country" className="input" {...register('country')}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
      <div><label htmlFor="a-city" className="label">City / district</label><input id="a-city" autoComplete="address-level2" className="input" {...register('city', { required: 'Enter your city', minLength: { value: 2, message: 'Enter your city' } })} />{e('city')}</div>
      <div className="sm:col-span-2"><label htmlFor="a-line" className="label">Street address</label><input id="a-line" autoComplete="street-address" className="input" {...register('line1', { required: 'Enter your street address', minLength: { value: 5, message: 'Enter the full street address' } })} />{e('line1')}</div>
      <div><label htmlFor="a-post" className="label">Postcode (optional)</label><input id="a-post" autoComplete="postal-code" className="input" {...register('postcode')} /></div>
      {showDefault && <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" {...register('isDefault')} /> Make this my default address</label>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={busy}>{submitLabel}</button>
        {onCancel && <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
