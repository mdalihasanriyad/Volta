import { useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import DataTable from '../components/DataTable'
import ImageUploader from '../components/ImageUploader'
import { Badge, ConfirmModal, Modal, PageHeader, money } from '../components/Ui'
import { ErrorBox } from '../../components/ui/AsyncState'
import PageLoader from '../../components/ui/PageLoader'
import useFetch from '../../hooks/useFetch'
import { api, errMsg, fieldErrors } from '../../services/api'
import { isSuper } from '../permissions'
import { useAdminAuth, useAdminToast } from '../store'

const blank = { name: '', sku: '', brand: '', category: '', subcategory: '', price: '', compareAtPrice: '', status: 'draft', isFeatured: false, description: '', images: [], colorsText: '', specsText: '', stock: 0, costPrice: 0, variants: [] }
const toColors = (t) => t.split(',').map((s) => s.trim()).filter(Boolean).map((n) => { const [name, hex] = n.split(':'); return { name: name.trim(), hex: (hex || '#9CA3AF').trim() } })
const toSpecs = (t) => Object.fromEntries(t.split('\n').map((l) => l.split(':')).filter((p) => p.length >= 2 && p[0].trim()).map((p) => [p[0].trim(), p.slice(1).join(':').trim()]))

// Variants of an existing product: edit price / availability, or add a new variant (own SKU, price and opening stock).
function VariantPanel({ product, canSeeCost }) {
  const notify = useAdminToast((s) => s.notify)
  const [variants, setVariants] = useState(product.variants || [])
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ sku: '', model: '', color: '', price: '', stock: 0, costPrice: 0 })
  const stockOf = (sku) => (product.inventory || []).find((i) => i.sku === sku)?.quantity

  const patch = async (v, body, ok) => {
    try { const { data } = await api.patch(`/admin/variants/${v._id}`, body); setVariants((vs) => vs.map((x) => (x._id === v._id ? data : x))); notify(ok) } catch (e) { notify(errMsg(e)) }
  }
  const add = async () => {
    setBusy(true)
    try {
      const body = { sku: f.sku, model: f.model || undefined, color: f.color || undefined, price: f.price === '' ? undefined : Number(f.price), stock: Number(f.stock) || 0, ...(canSeeCost ? { costPrice: Number(f.costPrice) || 0 } : {}) }
      const { data } = await api.post(`/admin/products/${product._id}/variants`, body)
      setVariants((vs) => [...vs, data.variant]); setAdding(false); setF({ sku: '', model: '', color: '', price: '', stock: 0, costPrice: 0 }); notify('Variant added')
    } catch (e) { notify(Object.values(fieldErrors(e))[0] || errMsg(e)) }
    setBusy(false)
  }
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between"><span className="label !mb-0">Variants</span><button type="button" className="btn-outline !py-1.5" onClick={() => setAdding((v) => !v)}><Plus size={14} /> Add variant</button></div>
      {variants.length === 0 && !adding && <p className="mt-1 text-xs text-gray-500">This is a simple product (one SKU). Add a variant to sell options such as storage size or color.</p>}
      {variants.map((v) => (
        <div key={v._id} className="mt-2 grid grid-cols-2 items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm sm:grid-cols-6">
          <span className="col-span-2 font-bold">{v.sku}</span><span>{[v.model, v.color].filter(Boolean).join(' / ')}</span>
          <input aria-label={`Price for ${v.sku}`} type="number" step="any" defaultValue={v.price ?? ''} placeholder="Product price" onBlur={(e) => e.target.value !== String(v.price ?? '') && patch(v, { price: e.target.value === '' ? null : Number(e.target.value) }, 'Variant price saved')} className="input !py-1.5" />
          <span className="text-xs text-gray-500">{stockOf(v.sku) !== undefined ? `${stockOf(v.sku)} in stock` : ''}</span>
          <label className="flex items-center gap-1 text-xs font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" checked={v.isActive} onChange={(e) => patch(v, { isActive: e.target.checked }, e.target.checked ? 'Variant enabled' : 'Variant hidden')} /> Sellable</label>
        </div>
      ))}
      {adding && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-brand p-3 sm:grid-cols-6">
          <input aria-label="New variant SKU" placeholder="SKU" className="input col-span-2" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
          <input aria-label="Model" placeholder="Model e.g. 512GB" className="input" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
          <input aria-label="Color" placeholder="Color" className="input" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
          <input aria-label="Price" type="number" step="any" placeholder="Price" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <input aria-label="Opening stock" type="number" min="0" placeholder="Stock" className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
          <button type="button" className="btn-primary col-span-2 sm:col-span-6" disabled={busy || !f.sku || (!f.model && !f.color)} onClick={add}>Save variant</button>
          <p className="col-span-2 text-xs text-gray-500 sm:col-span-6">A simple product must have zero stock under its own SKU before it can get variants.</p>
        </div>
      )}
    </div>
  )
}

function ProductForm({ product, lookups, onClose, onSaved }) {
  const isNew = !product._id
  const notify = useAdminToast((s) => s.notify)
  const canSeeCost = isSuper(useAdminAuth((s) => s.admin))
  const trash = useRef([])
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { ...blank, ...product } })
  const { fields: variants, append, remove } = useFieldArray({ control, name: 'variants' })

  const submit = async (v) => {
    const body = {
      name: v.name, sku: v.sku, brand: v.brand || undefined, category: v.category, subcategory: v.subcategory || undefined, description: v.description || undefined,
      images: v.images || [], price: Number(v.price), compareAtPrice: v.compareAtPrice === '' || v.compareAtPrice == null ? null : Number(v.compareAtPrice),
      status: v.status, isFeatured: !!v.isFeatured, colors: toColors(v.colorsText || ''), specs: toSpecs(v.specsText || ''),
    }
    if (isNew) {
      body.stock = Number(v.stock) || 0; body.costPrice = Number(v.costPrice) || 0
      body.variants = (v.variants || []).map((x) => ({ sku: x.sku, model: x.model || undefined, color: x.color || undefined, price: x.price === '' ? undefined : Number(x.price), stock: Number(x.stock) || 0, costPrice: Number(x.costPrice) || 0 }))
    }
    try {
      await (isNew ? api.post('/admin/products', body) : api.patch(`/admin/products/${product._id}`, body))
      trash.current.splice(0).forEach((id) => api.post('/admin/uploads/delete', { publicId: id }).catch(() => {}))
      notify(isNew ? 'Product created' : 'Product saved'); onSaved()
    } catch (e) {
      Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k.split('.')[0], { message: m }))
      setError('root', { message: errMsg(e) })
    }
  }
  const E = (n) => errors[n] && <p className="field-error">{errors[n].message}</p>
  return (
    <Modal title={isNew ? 'New product' : `Edit ${product.name}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="p-name" className="label">Name</label><input id="p-name" className="input" {...register('name', { required: 'Name is required' })} />{E('name')}</div>
        <div><label htmlFor="p-sku" className="label">SKU</label><input id="p-sku" className="input" {...register('sku', { required: 'SKU is required' })} />{E('sku')}</div>
        <div><label htmlFor="p-cat" className="label">Category</label><select id="p-cat" className="input" {...register('category', { required: 'Choose a category' })}><option value="">Select…</option>{lookups.categories.map((c) => <option key={c._id} value={c._id}>{c.parent ? '— ' : ''}{c.name}</option>)}</select>{E('category')}</div>
        <div><label htmlFor="p-brand" className="label">Brand</label><select id="p-brand" className="input" {...register('brand')}><option value="">None</option>{lookups.brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div>
        <div><label htmlFor="p-sub" className="label">Subcategory name</label><input id="p-sub" className="input" placeholder="e.g. Flagship" {...register('subcategory')} /></div>
        <div><label htmlFor="p-status" className="label">Status</label><select id="p-status" className="input" {...register('status')}><option value="draft">Draft (hidden)</option><option value="active">Active (visible)</option></select></div>
        <div><label htmlFor="p-price" className="label">Price (BDT)</label><input id="p-price" type="number" step="any" className="input" {...register('price', { required: 'Price is required', min: { value: 0, message: 'Price cannot be negative' } })} />{E('price')}</div>
        <div><label htmlFor="p-old" className="label">Original price (BDT, for discounts)</label><input id="p-old" type="number" step="any" className="input" {...register('compareAtPrice')} />{E('compareAtPrice')}</div>
        {isNew && variants.length === 0 && (<>
          <div><label htmlFor="p-stock" className="label">Opening stock</label><input id="p-stock" type="number" min="0" className="input" {...register('stock')} /></div>
          {canSeeCost && <div><label htmlFor="p-cost" className="label">Cost price per unit (BDT)</label><input id="p-cost" type="number" step="any" min="0" className="input" {...register('costPrice')} /></div>}
        </>)}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-deep" {...register('isFeatured')} /> Featured on homepage</label>
        <div className="sm:col-span-2"><label htmlFor="p-desc" className="label">Description</label><textarea id="p-desc" rows={3} className="input" {...register('description')} /></div>
        <div><label htmlFor="p-colors" className="label">Colors</label><input id="p-colors" className="input" placeholder="Black:#111827, Silver:#D1D5DB" {...register('colorsText')} /><p className="mt-1 text-xs text-gray-500">name:hex, comma separated</p></div>
        <div><label htmlFor="p-specs" className="label">Specifications</label><textarea id="p-specs" rows={3} className="input" placeholder={'Display: 6.7" AMOLED\nBattery: 5000 mAh'} {...register('specsText')} /><p className="mt-1 text-xs text-gray-500">One per line, “Name: value”</p></div>
        <div className="sm:col-span-2"><span className="label">Images (first image is the main one)</span><Controller name="images" control={control} render={({ field }) => <ImageUploader multiple value={field.value} onChange={field.onChange} folder="products" onRemoved={(id) => trash.current.push(id)} />} /></div>

        {isNew && (
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between"><span className="label !mb-0">Variants (optional)</span><button type="button" className="btn-outline !py-1.5" onClick={() => append({ sku: '', model: '', color: '', price: '', stock: 0, costPrice: 0 })}><Plus size={14} /> Add variant</button></div>
            <p className="mt-1 text-xs text-gray-500">Each variant has its own SKU, price and stock. Leave empty for a simple product.</p>
            {variants.map((f, i) => (
              <div key={f.id} className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-6">
                <input aria-label="Variant SKU" placeholder="SKU" className="input col-span-2" {...register(`variants.${i}.sku`, { required: true })} />
                <input aria-label="Model" placeholder="Model e.g. 256GB" className="input" {...register(`variants.${i}.model`)} />
                <input aria-label="Color" placeholder="Color" className="input" {...register(`variants.${i}.color`)} />
                <input aria-label="Variant price" type="number" step="any" placeholder="Price" className="input" {...register(`variants.${i}.price`)} />
                <input aria-label="Variant stock" type="number" min="0" placeholder="Stock" className="input" {...register(`variants.${i}.stock`)} />
                {canSeeCost && <input aria-label="Variant cost" type="number" step="any" min="0" placeholder="Cost" className="input" {...register(`variants.${i}.costPrice`)} />}
                <button type="button" aria-label="Remove variant" onClick={() => remove(i)} className="grid place-items-center text-red-600"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        {!isNew && <VariantPanel product={product} canSeeCost={canSeeCost} />}
        {!isNew && <p className="rounded-lg bg-gray-100 p-3 text-xs text-gray-600 sm:col-span-2">Stock levels are changed on the Inventory page so every change is recorded.</p>}
        {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save product'}</button></div>
      </form>
    </Modal>
  )
}

export default function Products() {
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const notify = useAdminToast((s) => s.notify)
  const list = useFetch(() => api.get('/admin/products', { params: { page, limit: 20, q: q || undefined, status: status || undefined } }).then((r) => r.data), [page, q, status])
  const lookups = useFetch(() => api.get('/admin/lookups').then((r) => r.data), [])

  const edit = async (p) => {
    try {
      const { data } = await api.get(`/admin/products/${p._id}`)
      setEditing({ ...data, category: data.category, brand: data.brand || '', compareAtPrice: data.compareAtPrice ?? '', colorsText: (data.colors || []).map((c) => `${c.name}:${c.hex}`).join(', '), specsText: Object.entries(data.specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n'), images: data.images || [] })
    } catch (e) { notify(errMsg(e)) }
  }
  const remove = async () => { try { await api.delete(`/admin/products/${deleting._id}`); notify('Product deleted'); list.reload() } catch (e) { notify(errMsg(e)) } setDeleting(null) }

  if (list.error) return <ErrorBox error={list.error} onRetry={list.reload} />
  if (!list.data || !lookups.data) return <PageLoader />
  const rows = list.data.items.map((p) => ({ ...p, id: p._id }))
  return (
    <>
      <PageHeader title="Products" subtitle="Add, edit and publish products. Images are stored on Cloudinary.">
        <button type="button" className="btn-primary" onClick={() => setEditing({ ...blank })}><Plus size={16} /> New product</button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="pq">Search products</label>
        <input id="pq" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search name, SKU or brand" className="input max-w-xs" />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="input max-w-[180px]"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option></select>
      </div>
      <DataTable rows={rows} server={{ page: list.data.page, pages: list.data.pages, total: list.data.total, onPage: setPage }}
        columns={[
          { key: 'name', label: 'Product', render: (p) => <span className="font-bold">{p.name}</span> }, { key: 'sku', label: 'SKU' }, { key: 'brandName', label: 'Brand' },
          { key: 'price', label: 'Price', render: (p) => money(p.price) }, { key: 'stock', label: 'Stock', render: (p) => <span className={p.stock <= 8 ? 'font-bold text-amber-600' : ''}>{p.stock}</span> },
          { key: 'status', label: 'Status', render: (p) => <Badge>{p.status === 'active' ? 'Active' : 'Draft'}</Badge> },
        ]}
        actions={(p) => (<>
          <button type="button" aria-label={`Edit ${p.name}`} onClick={() => edit(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-brand-deep hover:text-brand-deep"><Pencil size={14} /></button>
          <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)} className="grid h-8 w-8 place-items-center rounded-lg border border-gray-300 hover:border-red-500 hover:text-red-600"><Trash2 size={14} /></button>
        </>)} />
      {editing && <ProductForm product={editing} lookups={lookups.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload() }} />}
      {deleting && <ConfirmModal title="Delete product" text={`Delete “${deleting.name}”? Products that already have orders cannot be deleted; set them to Draft instead.`} onConfirm={remove} onClose={() => setDeleting(null)} />}
    </>
  )
}
