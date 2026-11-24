import { Category, Product } from '../models/index.js'
import { asyncHandler } from '../utils/helpers.js'
import { env } from '../config/env.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

export const sitemap = asyncHandler(async (req, res) => {
  const base = env.clientUrl
  const [products, categories] = await Promise.all([
    Product.find({ status: 'active' }).select('slug updatedAt').limit(5000).lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ])
  const urls = [
    { loc: `${base}/` }, { loc: `${base}/shop` }, { loc: `${base}/contact` },
    ...categories.map((c) => ({ loc: `${base}/shop?category=${c.slug}`, lastmod: c.updatedAt })),
    ...products.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: p.updatedAt })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml)
})

export const robots = (req, res) =>
  res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /api/\n\nSitemap: ${env.clientUrl}/sitemap.xml\n`)
