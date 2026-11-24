import { useMoney } from '../../utils/format'

export default function OrderSummary({ totals, children }) {
  const money = useMoney()
  return (
    <div className="card p-5">
      <h2 className="text-lg font-extrabold">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="font-semibold">{money(totals.subtotal)}</dd></div>
        {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Discount</dt><dd className="font-semibold">-{money(totals.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd className="font-semibold">{totals.shipping === 0 ? 'Free' : money(totals.shipping)}</dd></div>
        <div className="flex justify-between border-t border-gray-200 pt-3 text-base"><dt className="font-extrabold">Total</dt><dd className="font-extrabold">{money(totals.total)}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-gray-500">Payment: Cash on Delivery. Orders are recorded in BDT.</p>
      {children}
    </div>
  )
}
