import { useUI } from '../../store'

export default function Toaster() {
  const toast = useUI((s) => s.toast)
  if (!toast) return null
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-8">
      <div key={toast.id} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card">
        {toast.message}
      </div>
    </div>
  )
}
