// MOCK DATA (Phase 1 only). Replaced by MongoDB-backed APIs in Phase 4.

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Exchange rates here are placeholders for the UI. Real rates will be set by Super Admin (Phase 2/3).
export const currencies = [
  { code: 'BDT', symbol: '৳', rate: 1, decimals: 0, locale: 'en-IN', label: 'Bangladeshi Taka' },
  { code: 'USD', symbol: '$', rate: 0.0082, decimals: 2, locale: 'en-US', label: 'US Dollar' },
]

export const shippingConfig = {
  freeThresholdBDT: 5000,
  methods: [
    { id: 'standard', name: 'Standard delivery', eta: '2–4 working days', feeBDT: 80 },
    { id: 'express', name: 'Express delivery', eta: 'Next working day', feeBDT: 160 },
  ],
  // Countries where Cash on Delivery is available (Super Admin configurable later)
  codCountries: ['BD'],
}

export const countries = [
  { code: 'BD', name: 'Bangladesh' },
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
]

export const coupons = {
  WELCOME10: { type: 'percent', value: 10, min: 0, note: '10% off your order' },
  SAVE500: { type: 'fixed', value: 500, min: 5000, note: '৳500 off orders above ৳5,000' },
}

export const categories = [
  { slug: 'smartphones', name: 'Smartphones', icon: 'smartphone', subs: ['Flagship', 'Mid-range', 'Budget'] },
  { slug: 'laptops', name: 'Laptops', icon: 'laptop', subs: ['Ultrabooks', 'Gaming laptops', 'Student laptops', 'Business laptops'] },
  { slug: 'desktops', name: 'Desktop Computers', icon: 'server', subs: ['Brand PCs', 'Custom builds', 'All-in-one', 'Mini PCs'] },
  { slug: 'components', name: 'Computer Components', icon: 'cpu', subs: ['Processors', 'Graphics cards', 'Motherboards', 'RAM', 'Power supplies'] },
  { slug: 'monitors', name: 'Monitors', icon: 'monitor', subs: ['Gaming', 'Office', '4K & Creator', 'Ultrawide'] },
  { slug: 'tablets', name: 'Tablets', icon: 'tablet', subs: ['iPad', 'Android tablets', 'Drawing tablets'] },
  { slug: 'smartwatches', name: 'Smartwatches', icon: 'watch', subs: ['Smartwatches', 'Fitness bands'] },
  { slug: 'audio', name: 'Headphones & Earbuds', icon: 'headphones', subs: ['True wireless', 'Over-ear', 'Neckband'] },
  { slug: 'speakers', name: 'Speakers', icon: 'speaker', subs: ['Bluetooth speakers', 'Soundbars', 'Smart speakers'] },
  { slug: 'gaming', name: 'Gaming Accessories', icon: 'gamepad', subs: ['Controllers', 'Headsets', 'Chairs'] },
  { slug: 'peripherals', name: 'Keyboards & Mice', icon: 'keyboard', subs: ['Mechanical keyboards', 'Wireless mice', 'Combos'] },
  { slug: 'cameras', name: 'Cameras', icon: 'camera', subs: ['Mirrorless', 'Action cameras', 'Webcams', 'Security cameras'] },
  { slug: 'networking', name: 'Networking Devices', icon: 'router', subs: ['Routers', 'Switches', 'Wi-Fi extenders'] },
  { slug: 'smart-home', name: 'Smart Home Devices', icon: 'home', subs: ['Smart plugs', 'Lighting', 'Robot vacuums'] },
  { slug: 'mobile-accessories', name: 'Mobile Accessories', icon: 'plug', subs: ['Chargers', 'Cases', 'Cables'] },
  { slug: 'power-banks', name: 'Power Banks', icon: 'battery', subs: ['10,000 mAh', '20,000 mAh', 'Laptop power banks'] },
  { slug: 'storage', name: 'Storage Devices', icon: 'drive', subs: ['SSD', 'Portable HDD', 'Memory cards'] },
  { slug: 'other', name: 'Other Gadgets', icon: 'package', subs: ['Drones', 'Trackers'] },
]
export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]))

export const brands = ['Apple', 'Samsung', 'Xiaomi', 'Asus', 'Lenovo', 'HP', 'Sony', 'Logitech', 'Anker', 'JBL', 'Razer', 'TP-Link']

// name, brand, category, sub, price(BDT), oldPrice, stock, rating, sold, tags (f=featured n=new b=best)
const seed = [
  ['Galaxy S24 Ultra 256GB', 'Samsung', 'smartphones', 'Flagship', 164900, 179900, 14, 4.8, 620, 'fb'],
  ['iPhone 15 Pro 256GB', 'Apple', 'smartphones', 'Flagship', 168000, null, 9, 4.9, 540, 'fb'],
  ['Redmi Note 13 Pro', 'Xiaomi', 'smartphones', 'Mid-range', 38900, 42900, 40, 4.5, 880, 'b'],
  ['Xiaomi Poco X6', 'Xiaomi', 'smartphones', 'Mid-range', 31900, null, 0, 4.4, 410, 'n'],
  ['Zenbook 14 OLED', 'Asus', 'laptops', 'Ultrabooks', 119500, 129000, 8, 4.7, 160, 'f'],
  ['ROG Strix G16', 'Asus', 'laptops', 'Gaming laptops', 189000, null, 5, 4.6, 90, 'fn'],
  ['IdeaPad Slim 3', 'Lenovo', 'laptops', 'Student laptops', 58500, 62900, 22, 4.3, 300, 'b'],
  ['HP Pavilion 15', 'HP', 'laptops', 'Business laptops', 72000, null, 12, 4.2, 140, 'n'],
  ['Mini PC N100 16GB', 'Lenovo', 'desktops', 'Mini PCs', 24500, 27900, 18, 4.1, 75, 'n'],
  ['Ryzen 5 7600X Processor', 'HP', 'components', 'Processors', 29800, null, 25, 4.7, 210, 'b'],
  ['RTX 4060 8GB Graphics Card', 'Asus', 'components', 'Graphics cards', 56500, 59900, 7, 4.6, 180, 'f'],
  ['27-inch 165Hz Gaming Monitor', 'Samsung', 'monitors', 'Gaming', 27900, 31500, 16, 4.5, 260, 'fb'],
  ['24-inch Office Monitor', 'HP', 'monitors', 'Office', 13900, null, 30, 4.2, 330, ''],
  ['Galaxy Tab S9 FE', 'Samsung', 'tablets', 'Android tablets', 49900, 54900, 11, 4.4, 95, 'n'],
  ['Watch GT Active', 'Xiaomi', 'smartwatches', 'Smartwatches', 8900, 10500, 60, 4.2, 700, 'b'],
  ['WH-1000XM5 Headphones', 'Sony', 'audio', 'Over-ear', 36900, 41900, 13, 4.9, 280, 'fb'],
  ['Soundcore Liberty 4 NC', 'Anker', 'audio', 'True wireless', 11900, 13900, 45, 4.5, 510, 'b'],
  ['Flip 6 Bluetooth Speaker', 'JBL', 'speakers', 'Bluetooth speakers', 12900, null, 34, 4.6, 390, ''],
  ['Wireless Gamepad Pro', 'Razer', 'gaming', 'Controllers', 9900, 11500, 20, 4.3, 120, 'n'],
  ['MX Master 3S Mouse', 'Logitech', 'peripherals', 'Wireless mice', 11500, null, 28, 4.8, 340, 'fb'],
  ['K380 Wireless Keyboard', 'Logitech', 'peripherals', 'Combos', 4900, 5500, 50, 4.4, 450, ''],
  ['Full HD Webcam C920', 'Logitech', 'cameras', 'Webcams', 8200, null, 19, 4.4, 230, ''],
  ['Archer AX55 Wi-Fi 6 Router', 'TP-Link', 'networking', 'Routers', 9500, 10900, 26, 4.5, 270, 'f'],
  ['Smart Plug Mini (2 pack)', 'TP-Link', 'smart-home', 'Smart plugs', 1900, null, 80, 4.1, 600, 'n'],
  ['65W GaN Fast Charger', 'Anker', 'mobile-accessories', 'Chargers', 3200, 3900, 70, 4.7, 820, 'b'],
  ['20,000 mAh Power Bank', 'Anker', 'power-banks', '20,000 mAh', 4800, 5600, 38, 4.6, 640, 'b'],
  ['T7 Portable SSD 1TB', 'Samsung', 'storage', 'SSD', 13900, 15900, 21, 4.8, 350, 'f'],
  ['Foldable Mini Drone 4K', 'Xiaomi', 'other', 'Drones', 21900, null, 0, 4.0, 40, 'n'],
]

const colorSets = [
  [{ name: 'Black', hex: '#111827' }, { name: 'Silver', hex: '#D1D5DB' }],
  [{ name: 'Black', hex: '#111827' }, { name: 'Sky Blue', hex: '#38BDF8' }, { name: 'White', hex: '#FFFFFF' }],
  [{ name: 'Graphite', hex: '#4B5563' }, { name: 'Silver', hex: '#D1D5DB' }],
]
const modelCats = { smartphones: ['128GB', '256GB', '512GB'], laptops: ['8GB / 512GB', '16GB / 512GB', '16GB / 1TB'], tablets: ['128GB', '256GB'], storage: ['500GB', '1TB', '2TB'] }

const specTemplates = {
  smartphones: { Display: '6.7" AMOLED, 120Hz', Chipset: 'Octa-core flagship', Battery: '5000 mAh', Camera: '50MP main', Network: '5G' },
  laptops: { Display: '14"–16" FHD+', Processor: 'Latest-gen CPU', Memory: '16GB RAM', Storage: '512GB NVMe SSD', Battery: 'Up to 12 hours' },
  monitors: { 'Panel size': '24"–27"', Resolution: '1920 × 1080', 'Refresh rate': '75–165Hz', Ports: 'HDMI, DisplayPort' },
  audio: { Type: 'Wireless', Battery: 'Up to 30 hours', Connectivity: 'Bluetooth 5.3', 'Noise control': 'Active' },
  storage: { Interface: 'USB 3.2 / NVMe', 'Read speed': 'Up to 1050 MB/s', Form: 'Portable' },
}

export const products = seed.map((t, i) => {
  const [name, brand, category, sub, price, oldPrice, stock, rating, sold, tags] = t
  const models = modelCats[category]
  return {
    id: 'p' + (i + 1),
    slug: slugify(name),
    sku: `VLT-${category.slice(0, 3).toUpperCase()}-${1000 + i}`,
    name, brand, category, sub, price, oldPrice, stock, rating, sold,
    reviews: Math.round(sold / 6) + 3,
    createdAt: Date.now() - i * 3 * 86400000,
    featured: tags.includes('f'),
    isNew: tags.includes('n'),
    best: tags.includes('b'),
    offer: !!oldPrice,
    colors: colorSets[i % 3],
    models: models ? models.map((m, k) => ({ name: m, delta: k * (category === 'storage' ? 4000 : 6000) })) : null,
    specs: { Brand: brand, Category: categoryBySlug[category].name, ...(specTemplates[category] || { Type: sub, Connectivity: 'Standard' }), Warranty: '12 months' },
    description: `${name} by ${brand}. Genuine product with official warranty, tested before dispatch and delivered with Cash on Delivery across Bangladesh.`,
  }
})
export const productById = Object.fromEntries(products.map((p) => [p.id, p]))
export const productBySlug = Object.fromEntries(products.map((p) => [p.slug, p]))

export const heroSlides = [
  { id: 1, title: 'Flagship phones, delivered to your door', text: 'Genuine devices with official warranty. Pay when they arrive.', cta: 'Shop smartphones', to: '/shop?category=smartphones', icon: 'smartphone' },
  { id: 2, title: 'Build a faster desk setup', text: 'Monitors, keyboards and components picked for work and play.', cta: 'Browse components', to: '/shop?category=components', icon: 'cpu' },
  { id: 3, title: 'Up to 20% off audio this week', text: 'Over-ear, true wireless and speakers from top brands.', cta: 'See audio deals', to: '/shop?category=audio&discount=1', icon: 'headphones' },
]

export const reviewsMock = [
  { id: 1, name: 'Rafiq A.', rating: 5, date: '2 weeks ago', text: 'Delivered in two days and exactly as described. Packaging was solid.', verified: true },
  { id: 2, name: 'Nusrat J.', rating: 4, date: '1 month ago', text: 'Good value for the price. Warranty card was included.', verified: true },
  { id: 3, name: 'Tanvir H.', rating: 5, date: '2 months ago', text: 'Works perfectly, would buy again.', verified: true },
]

export const ordersMock = [
  { number: 'VLT-20418833', date: '2026-11-02', status: 'Delivered', totalBDT: 38900, items: ['Redmi Note 13 Pro'] },
  { number: 'VLT-20391204', date: '2026-10-21', status: 'Out for Delivery', totalBDT: 14800, items: ['65W GaN Fast Charger', 'Soundcore Liberty 4 NC'] },
  { number: 'VLT-20377710', date: '2026-10-09', status: 'Shipped', totalBDT: 27900, items: ['27-inch 165Hz Gaming Monitor'] },
]

export const orderStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']
