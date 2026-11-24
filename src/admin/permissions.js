import {
  LayoutDashboard, Package, FolderTree, Tag, Image, Boxes, ClipboardList, Users, BarChart3, Ticket,
  MessageSquare, Truck, Coins, FileText, Search, Bell, ShieldCheck, ScrollText, Settings,
} from 'lucide-react'

// Permissions a Super Admin can grant to a regular Admin (must match the server list).
export const assignable = [
  ['orders', 'Order management'], ['customers', 'Customer support'], ['products', 'Products and brands'],
  ['inventory', 'Inventory'], ['categories', 'Categories'], ['banners', 'Banners'], ['reviews', 'Review moderation'],
]

// Menu only. The server enforces the same rules on every request, so hiding a menu item is a convenience, not security.
export const modules = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard, perm: null, group: 'Overview' },
  { id: 'orders', label: 'Orders', path: '/admin/orders', icon: ClipboardList, perm: 'orders', group: 'Sales' },
  { id: 'customers', label: 'Customers', path: '/admin/customers', icon: Users, perm: 'customers', group: 'Sales' },
  { id: 'sales', label: 'Sales reports', path: '/admin/sales', icon: BarChart3, superOnly: true, group: 'Sales' },
  { id: 'coupons', label: 'Coupons', path: '/admin/coupons', icon: Ticket, superOnly: true, group: 'Sales' },
  { id: 'products', label: 'Products', path: '/admin/products', icon: Package, perm: 'products', group: 'Catalog' },
  { id: 'categories', label: 'Categories', path: '/admin/categories', icon: FolderTree, perm: 'categories', group: 'Catalog' },
  { id: 'brands', label: 'Brands', path: '/admin/brands', icon: Tag, perm: 'products', group: 'Catalog' },
  { id: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Boxes, perm: 'inventory', group: 'Catalog' },
  { id: 'reviews', label: 'Reviews', path: '/admin/reviews', icon: MessageSquare, perm: 'reviews', group: 'Catalog' },
  { id: 'banners', label: 'Banners', path: '/admin/banners', icon: Image, perm: 'banners', group: 'Storefront' },
  { id: 'content', label: 'Content', path: '/admin/content', icon: FileText, superOnly: true, group: 'Storefront' },
  { id: 'seo', label: 'SEO', path: '/admin/seo', icon: Search, superOnly: true, group: 'Storefront' },
  { id: 'shipping', label: 'Shipping', path: '/admin/shipping', icon: Truck, superOnly: true, group: 'Store setup' },
  { id: 'currency', label: 'Currency', path: '/admin/currency', icon: Coins, superOnly: true, group: 'Store setup' },
  { id: 'notifications', label: 'Notifications', path: '/admin/notifications', icon: Bell, perm: null, group: 'Store setup' },
  { id: 'admins', label: 'Admin management', path: '/admin/admins', icon: ShieldCheck, superOnly: true, group: 'System' },
  { id: 'logs', label: 'Activity logs', path: '/admin/logs', icon: ScrollText, superOnly: true, group: 'System' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings, superOnly: true, group: 'System' },
]

export const isSuper = (admin) => admin?.role === 'super_admin'
export function canAccess(admin, m) {
  if (!admin) return false
  if (isSuper(admin)) return true
  if (m.superOnly) return false
  return m.perm === null || m.perm === undefined || admin.permissions.includes(m.perm)
}
