import { Truck, Phone } from 'lucide-react'
import { useCatalog } from '../../store/catalog'

export default function AnnouncementBar() {
  const settings = useCatalog((s) => s.settings)
  if (!settings.announcement && !settings.phone) return null
  return (
    <div className="bg-ink text-xs text-white">
      <div className="container-x flex items-center justify-between gap-4 py-2">
        <p className="flex items-center gap-2"><Truck size={14} className="text-brand" /> {settings.announcement}</p>
        {settings.phone && <p className="hidden items-center gap-2 md:flex"><Phone size={14} className="text-brand" /> Hotline: {settings.phone}</p>}
      </div>
    </div>
  )
}
