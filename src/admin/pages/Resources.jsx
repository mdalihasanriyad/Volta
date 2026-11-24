import ResourcePage from '../components/ResourcePage'
import { Badge, money } from '../components/Ui'

const yn = (v) => <Badge>{v ? 'Yes' : 'No'}</Badge>
const csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean)
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

export function Categories() {
  return (
    <ResourcePage
      title="Categories" subtitle="Categories and subcategories shown in the mega menu. Use Order to reorder." noun="category" endpoint="/admin/categories" lookups
      defaults={{ isActive: true, parent: '', order: 0, image: null }}
      toForm={(c) => ({ ...c, parent: c.parent || '' })}
      toPayload={(v) => ({ name: v.name, slug: v.slug, parent: v.parent || null, order: v.order || 0, icon: v.icon || undefined, image: v.image || undefined, isActive: !!v.isActive })}
      columns={[
        { key: 'name', label: 'Name', render: (c) => <span className={c.parent ? 'pl-4 text-gray-600' : 'font-bold'}>{c.parent ? '↳ ' : ''}{c.name}</span> }, { key: 'slug', label: 'Slug' },
        { key: 'order', label: 'Order' }, { key: 'isActive', label: 'Visible', render: (c) => yn(c.isActive) },
      ]}
      fields={(ctx) => [
        { name: 'name', label: 'Name', required: true }, { name: 'slug', label: 'Slug', required: true, help: 'Lowercase letters, numbers and dashes.' },
        { name: 'parent', label: 'Parent category', type: 'select', options: [{ value: '', label: 'None (top level)' }, ...(ctx.categories || []).filter((c) => !c.parent).map((c) => ({ value: c._id, label: c.name }))] },
        { name: 'order', label: 'Order', type: 'number', min: 0 }, { name: 'icon', label: 'Icon name', help: 'e.g. smartphone, laptop, cpu, headphones' },
        { name: 'isActive', label: 'Visible in store', type: 'checkbox' }, { name: 'image', label: 'Image', type: 'image', folder: 'categories' },
      ]}
    />
  )
}

export function Brands() {
  return (
    <ResourcePage
      title="Brands" subtitle="Brand logos are stored on Cloudinary." noun="brand" endpoint="/admin/brands" defaults={{ isPopular: false, isActive: true, logo: null }}
      toPayload={(v) => ({ name: v.name, slug: v.slug, logo: v.logo || undefined, isPopular: !!v.isPopular, isActive: !!v.isActive })}
      columns={[{ key: 'name', label: 'Brand', render: (b) => <span className="font-bold">{b.name}</span> }, { key: 'slug', label: 'Slug' }, { key: 'isPopular', label: 'Popular brand', render: (b) => yn(b.isPopular) }, { key: 'isActive', label: 'Active', render: (b) => yn(b.isActive) }]}
      fields={[{ name: 'name', label: 'Name', required: true }, { name: 'slug', label: 'Slug', required: true }, { name: 'isPopular', label: 'Show in popular brands', type: 'checkbox' }, { name: 'isActive', label: 'Active', type: 'checkbox' }, { name: 'logo', label: 'Logo', type: 'image', folder: 'brands' }]}
    />
  )
}

export function Banners() {
  return (
    <ResourcePage
      title="Banners" subtitle="Hero slider and promotional banners on the homepage." noun="banner" nameKey="title" endpoint="/admin/banners" defaults={{ position: 'hero', isActive: true, order: 0, link: '/shop', image: null }}
      toPayload={(v) => ({ title: v.title, subtitle: v.subtitle || undefined, position: v.position, ctaLabel: v.ctaLabel || undefined, link: v.link, order: v.order || 0, isActive: !!v.isActive, image: v.image || undefined })}
      columns={[{ key: 'title', label: 'Title', render: (b) => <span className="font-bold">{b.title}</span> }, { key: 'position', label: 'Position' }, { key: 'link', label: 'Link' }, { key: 'order', label: 'Order' }, { key: 'isActive', label: 'Active', render: (b) => yn(b.isActive) }]}
      fields={[
        { name: 'title', label: 'Title', required: true }, { name: 'position', label: 'Position', type: 'select', options: ['hero', 'promo'] },
        { name: 'subtitle', label: 'Subtitle' }, { name: 'ctaLabel', label: 'Button label' }, { name: 'link', label: 'Button link', required: true, help: 'e.g. /shop?category=laptops' },
        { name: 'order', label: 'Order', type: 'number', min: 0 }, { name: 'isActive', label: 'Active', type: 'checkbox' }, { name: 'image', label: 'Banner image (wide, 1400px+ recommended)', type: 'image', folder: 'banners' },
      ]}
    />
  )
}

export function Coupons() {
  return (
    <ResourcePage
      title="Coupons" subtitle="Coupons are validated again on the server when an order is placed." noun="coupon" nameKey="code" endpoint="/admin/coupons"
      defaults={{ type: 'percent', value: 10, minPurchase: 0, maxDiscount: 0, usageLimit: 0, perUserLimit: 0, active: true }}
      toForm={(c) => ({ ...c, startsAt: dateInput(c.startsAt), expiresAt: dateInput(c.expiresAt), campaign: c.campaign || '' })}
      toPayload={(v) => ({ code: v.code, type: v.type, value: v.value, maxDiscount: v.maxDiscount || 0, minPurchase: v.minPurchase || 0, usageLimit: v.usageLimit || 0, perUserLimit: v.perUserLimit || 0, startsAt: v.startsAt || null, expiresAt: v.expiresAt || null, campaign: v.campaign || undefined, active: !!v.active })}
      columns={[
        { key: 'code', label: 'Code', render: (c) => <span className="font-bold">{c.code}</span> }, { key: 'type', label: 'Type' },
        { key: 'value', label: 'Value', render: (c) => (c.type === 'percent' ? `${c.value}%` : money(c.value)) }, { key: 'minPurchase', label: 'Min. order', render: (c) => money(c.minPurchase) },
        { key: 'used', label: 'Used', render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` }, { key: 'expiresAt', label: 'Expires', render: (c) => (c.expiresAt ? dateInput(c.expiresAt) : '–') }, { key: 'active', label: 'Active', render: (c) => yn(c.active) },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true }, { name: 'type', label: 'Type', type: 'select', options: [{ value: 'percent', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount (BDT)' }] },
        { name: 'value', label: 'Value', type: 'number', required: true, min: 0 }, { name: 'maxDiscount', label: 'Max discount (BDT, 0 = none)', type: 'number', min: 0 },
        { name: 'minPurchase', label: 'Minimum purchase (BDT)', type: 'number', min: 0 }, { name: 'usageLimit', label: 'Total usage limit (0 = unlimited)', type: 'number', min: 0 },
        { name: 'perUserLimit', label: 'Per customer limit (0 = unlimited)', type: 'number', min: 0 }, { name: 'campaign', label: 'Campaign name' },
        { name: 'startsAt', label: 'Starts on', type: 'date' }, { name: 'expiresAt', label: 'Expires on', type: 'date' }, { name: 'active', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}

export function Reviews() {
  return (
    <ResourcePage
      title="Reviews" subtitle="Only verified purchasers can review. Approve or reject each review." noun="review" nameKey="userName" endpoint="/admin/reviews" allowCreate={false} allowEdit={false} allowDelete={false}
      filters={{ key: 'status', label: 'status', options: ['pending', 'approved', 'rejected'] }}
      rowActions={[{ label: 'Approve', patch: { status: 'approved' }, when: (r) => r.status !== 'approved' }, { label: 'Reject', patch: { status: 'rejected' }, when: (r) => r.status !== 'rejected' }]}
      columns={[
        { key: 'product', label: 'Product', render: (r) => r.product?.name }, { key: 'userName', label: 'Customer' }, { key: 'rating', label: 'Rating', render: (r) => '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) },
        { key: 'comment', label: 'Review' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge> },
      ]}
      fields={[]}
    />
  )
}

export function Customers() {
  return (
    <ResourcePage
      title="Customers" subtitle="Customer support view. Blocking a customer signs them out and stops new orders." noun="customer" endpoint="/admin/customers" paged allowCreate={false} allowDelete={false}
      toForm={(c) => ({ _id: c._id, name: c.name, email: c.email, status: c.status })}
      toPayload={(v) => ({ status: v.status })}
      rowActions={[{ label: 'Block', patch: { status: 'blocked' }, when: (r) => r.status === 'active' }, { label: 'Unblock', patch: { status: 'active' }, when: (r) => r.status === 'blocked' }]}
      columns={[
        { key: 'name', label: 'Customer', render: (c) => <span className="font-bold">{c.name}</span> }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
        { key: 'emailVerified', label: 'Verified', render: (c) => yn(c.emailVerified) }, { key: 'orders', label: 'Orders' }, { key: 'spent', label: 'Spent', render: (c) => money(c.spent) },
        { key: 'status', label: 'Status', render: (c) => <Badge>{c.status === 'active' ? 'Active' : 'Blocked'}</Badge> },
      ]}
      fields={[{ name: 'name', label: 'Name', readOnly: true }, { name: 'email', label: 'Email', readOnly: true }, { name: 'status', label: 'Status', type: 'select', options: ['active', 'blocked'] }]}
    />
  )
}

export function Shipping() {
  return (
    <ResourcePage
      title="Shipping zones" subtitle="Delivery charges, free-shipping thresholds and where Cash on Delivery is available. Orders to places outside every active zone are rejected." noun="shipping zone" endpoint="/admin/shipping-zones"
      defaults={{ codAvailable: false, isActive: true, baseFee: 0, freeThreshold: 0, countries: 'BD' }}
      toForm={(z) => ({ ...z, countries: (z.countries || []).join(', '), regions: (z.regions || []).join(', '), expressFee: z.expressFee ?? '' })}
      toPayload={(v) => ({ name: v.name, countries: csv(v.countries), regions: csv(v.regions), baseFee: v.baseFee, expressFee: v.expressFee === '' || v.expressFee == null ? null : v.expressFee, freeThreshold: v.freeThreshold || 0, eta: v.eta || undefined, codAvailable: !!v.codAvailable, isActive: !!v.isActive })}
      columns={[
        { key: 'name', label: 'Zone', render: (z) => <span className="font-bold">{z.name}</span> }, { key: 'countries', label: 'Countries', render: (z) => z.countries.join(', ') }, { key: 'regions', label: 'Regions', render: (z) => (z.regions.length ? z.regions.join(', ') : 'All') },
        { key: 'baseFee', label: 'Charge', render: (z) => money(z.baseFee) }, { key: 'freeThreshold', label: 'Free over', render: (z) => (z.freeThreshold ? money(z.freeThreshold) : '–') },
        { key: 'eta', label: 'Delivery' }, { key: 'codAvailable', label: 'COD', render: (z) => yn(z.codAvailable) }, { key: 'isActive', label: 'Active', render: (z) => yn(z.isActive) },
      ]}
      fields={[
        { name: 'name', label: 'Zone name', required: true }, { name: 'countries', label: 'Countries (ISO codes, comma separated, * = everywhere)', required: true, help: 'e.g. BD, IN or *' },
        { name: 'regions', label: 'Cities / regions (empty = whole country)', help: 'A zone with regions wins over the country-wide zone.' }, { name: 'eta', label: 'Estimated delivery' },
        { name: 'baseFee', label: 'Standard delivery charge (BDT)', type: 'number', required: true, min: 0 }, { name: 'expressFee', label: 'Express charge (BDT, empty = not offered)', type: 'number', min: 0 },
        { name: 'freeThreshold', label: 'Free standard delivery over (BDT, 0 = never)', type: 'number', min: 0 },
        { name: 'codAvailable', label: 'Cash on Delivery available in this zone', type: 'checkbox' }, { name: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  )
}
