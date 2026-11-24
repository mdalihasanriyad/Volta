import { Star } from 'lucide-react'

export default function Rating({ value, count, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <span className="inline-flex" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            width={size}
            height={size}
            className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
          />
        ))}
      </span>
      {count !== undefined && <span>({count})</span>}
    </span>
  )
}
