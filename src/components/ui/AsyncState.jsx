import { AlertTriangle } from 'lucide-react'
import { errMsg } from '../../services/api'

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-12 text-center">
      <AlertTriangle className="mx-auto mb-3 text-amber-500" size={40} />
      <p className="font-bold">{errMsg(error)}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-outline mt-4">Try again</button>}
    </div>
  )
}

export function GridSkeleton({ count = 8, className = 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${className}`} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-gray-200"><div className="aspect-square bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-1/3 rounded bg-gray-100" /><div className="h-4 w-3/4 rounded bg-gray-100" /><div className="h-4 w-1/2 rounded bg-gray-100" /></div></div>
      ))}
    </div>
  )
}
