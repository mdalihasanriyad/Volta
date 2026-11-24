import { useActiveCurrency } from '../store'

// Prices are stored in BDT. Display prices use the rate configured by the Super Admin (never an assumed rate).
export function formatWith(amountBDT, c) {
  const value = amountBDT * c.rate
  const locale = c.code === 'BDT' ? 'en-IN' : 'en-US'
  return `${c.symbol}${value.toLocaleString(locale, { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals })}`
}
export function useMoney() {
  const c = useActiveCurrency()
  return (amountBDT) => formatWith(amountBDT, c)
}
export const discountPct = (p) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0)

// Formats an amount that is already in the order/quote currency (snapshot = { symbol, decimals, code }).
export function formatSnapshot(value, snap) {
  const locale = snap.code === 'BDT' ? 'en-IN' : 'en-US'
  return `${snap.symbol}${Number(value).toLocaleString(locale, { minimumFractionDigits: snap.decimals, maximumFractionDigits: snap.decimals })}`
}
export const formatBDT = (n) => `৳${Math.round(n).toLocaleString('en-IN')}`
