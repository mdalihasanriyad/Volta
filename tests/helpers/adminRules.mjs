// Hand-written access rules for every admin route. Independent of the code: the test fails if the real routes disagree.
// ---------- hand-written rules: METHOD path -> who may pass ----------
// 'public' | 'admin' (any active admin) | 'super' | permission name(s)
export const ADMIN_RULES = {
  'POST /auth/login': 'public', 'POST /auth/logout': 'public', 'POST /auth/refresh': 'public', 'GET /auth/session': 'public',
  'GET /auth/me': 'admin', 'PATCH /auth/password': 'admin',
  'GET /dashboard': 'admin', 'GET /lookups': 'admin', 'GET /notifications': 'admin', 'PATCH /notifications/:id/read': 'admin',
  'POST /uploads/sign': ['products', 'banners', 'categories'], 'POST /uploads/delete': ['products', 'banners', 'categories'],
  'GET /products': 'products', 'POST /products': 'products', 'GET /products/:id': 'products', 'PATCH /products/:id': 'products', 'DELETE /products/:id': 'products',
  'POST /products/:id/variants': 'products', 'PATCH /variants/:id': 'products',
  'GET /brands': 'products', 'POST /brands': 'products', 'PATCH /brands/:id': 'products', 'DELETE /brands/:id': 'products',
  'GET /categories': 'categories', 'POST /categories': 'categories', 'PATCH /categories/:id': 'categories', 'DELETE /categories/:id': 'categories',
  'GET /banners': 'banners', 'POST /banners': 'banners', 'PATCH /banners/:id': 'banners', 'DELETE /banners/:id': 'banners',
  'GET /inventory': 'inventory', 'GET /inventory/movements': 'inventory', 'POST /inventory/adjust': 'inventory',
  'GET /orders': 'orders', 'GET /orders/:id': 'orders', 'PATCH /orders/:id/status': 'orders', 'PATCH /orders/:id': 'orders', 'POST /orders/:id/cancel': 'orders',
  'GET /customers': 'customers', 'PATCH /customers/:id': 'customers',
  'GET /reviews': 'reviews', 'PATCH /reviews/:id': 'reviews',
  // financial, security and global settings: Super Admin only
  'GET /sales': 'super', 'GET /coupons': 'super', 'POST /coupons': 'super', 'PATCH /coupons/:id': 'super', 'DELETE /coupons/:id': 'super',
  'GET /shipping-zones': 'super', 'POST /shipping-zones': 'super', 'PATCH /shipping-zones/:id': 'super', 'DELETE /shipping-zones/:id': 'super',
  'GET /currencies': 'super', 'POST /currencies': 'super', 'PATCH /currencies/:id': 'super', 'DELETE /currencies/:id': 'super',
  'GET /settings': 'super', 'PUT /settings': 'super',
  'GET /admins': 'super', 'POST /admins': 'super', 'PATCH /admins/:id': 'super', 'GET /logs': 'super',
}

