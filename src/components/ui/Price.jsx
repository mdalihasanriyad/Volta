import { useMoney, discountPct } from '../../utils/format'

export default function Price({ product, unit, size = 'md' }) {
  const money = useMoney()
  const price = unit ?? product.price
  const pct = discountPct(product)
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-extrabold text-ink ${size === 'lg' ? 'text-3xl' : 'text-base'}`}>{money(price)}</span>
      {product.oldPrice && (
        <>
          <span className={`text-gray-400 line-through ${size === 'lg' ? 'text-base' : 'text-xs'}`}>{money(product.oldPrice)}</span>
          {size === 'lg' && <span className="chip bg-brand-soft text-brand-deep">Save {pct}%</span>}
        </>
      )}
    </div>
  )
}
