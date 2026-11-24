import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { api, errMsg } from '../../services/api'
import { imageUrl } from '../../utils/normalize'

const MAX_MB = 5
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Uploads straight to Cloudinary with a signature from our server (the API secret never reaches the browser).
async function uploadToCloudinary(file, folder) {
  const { data: sig } = await api.post('/admin/uploads/sign', { folder })
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', sig.apiKey)
  form.append('timestamp', sig.timestamp)
  form.append('folder', sig.folder)
  form.append('allowed_formats', sig.allowed_formats)
  form.append('signature', sig.signature)
  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || 'Upload failed')
  return { url: json.secure_url, publicId: json.public_id }
}

// value: one image object (single) or an array (multiple). onRemoved(publicId) lets the form delete old files after saving.
export default function ImageUploader({ value, onChange, folder, multiple = false, max = 8, onRemoved, label = 'Add image' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const list = multiple ? value || [] : value ? [value] : []

  const pick = async (e) => {
    const files = [...e.target.files].slice(0, multiple ? max - list.length : 1)
    e.target.value = ''
    setError('')
    for (const f of files) {
      if (!TYPES.includes(f.type)) return setError('Use a JPG, PNG or WebP image.')
      if (f.size > MAX_MB * 1024 * 1024) return setError(`Each image must be under ${MAX_MB} MB.`)
    }
    setBusy(true)
    try {
      const uploaded = []
      for (const f of files) uploaded.push({ ...(await uploadToCloudinary(f, folder)), alt: '' })
      if (multiple) onChange([...list, ...uploaded])
      else { if (value?.publicId) onRemoved?.(value.publicId); onChange(uploaded[0]) }
    } catch (err) { setError(err.response ? errMsg(err) : err.message) }
    setBusy(false)
  }
  const removeAt = (i) => {
    const img = list[i]
    if (img?.publicId) onRemoved?.(img.publicId)
    onChange(multiple ? list.filter((_, k) => k !== i) : null)
  }
  const makeFirst = (i) => onChange([list[i], ...list.filter((_, k) => k !== i)])
  const setAlt = (i, alt) => onChange(list.map((x, k) => (k === i ? { ...x, alt } : x)))

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {list.map((img, i) => (
          <div key={img.publicId || img.url} className="w-28">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200">
              <img src={imageUrl(img.url, 240)} alt={img.alt || ''} className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove image" onClick={() => removeAt(i)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-600 shadow"><Trash2 size={14} /></button>
              {multiple && i === 0 && <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">Main</span>}
            </div>
            {multiple && i > 0 && <button type="button" onClick={() => makeFirst(i)} className="mt-1 text-xs font-semibold text-brand-deep">Make main</button>}
            <input aria-label="Image description (alt text)" placeholder="Alt text" value={img.alt || ''} onChange={(e) => (multiple ? setAlt(i, e.target.value) : onChange({ ...img, alt: e.target.value }))} className="input mt-1 !px-2 !py-1 !text-xs" />
          </div>
        ))}
        {(multiple ? list.length < max : true) && (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="grid h-28 w-28 place-items-center rounded-lg border-2 border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-brand-deep hover:text-brand-deep disabled:opacity-50">
            <span className="flex flex-col items-center gap-1"><ImagePlus size={20} />{busy ? 'Uploading…' : list.length && !multiple ? 'Replace' : label}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={TYPES.join(',')} multiple={multiple} className="hidden" onChange={pick} />
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  )
}
