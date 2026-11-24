import { Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react'

const items = [
  { icon: Truck, title: 'Cash on Delivery', text: 'Pay when your order arrives' },
  { icon: ShieldCheck, title: 'Genuine products', text: 'Official warranty on every item' },
  { icon: RotateCcw, title: '7-day returns', text: 'For unused, sealed products' },
  { icon: Headset, title: 'Support 10am–8pm', text: 'Call or message us daily' },
]

export default function TrustStrip() {
  return (
    <section className="container-x py-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-100 p-4 md:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-3">
            <Icon size={22} className="mt-0.5 shrink-0 text-brand-deep" />
            <div><p className="text-sm font-bold">{title}</p><p className="text-xs text-gray-500">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  )
}
