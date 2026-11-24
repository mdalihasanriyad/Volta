import { useMemo } from 'react'
import { useCart } from '../store'

// Cart lines for display. These prices are a convenience snapshot; the server recalculates everything at checkout.
export function useCartLines() {
  const items = useCart((s) => s.items)
  return useMemo(() => items.map((it) => ({ ...it, product: { id: it.productId, ...it.snap }, unit: it.snap.price, total: it.snap.price * it.qty })), [items])
}
export const cartSubtotal = (lines) => lines.reduce((n, l) => n + l.total, 0)
