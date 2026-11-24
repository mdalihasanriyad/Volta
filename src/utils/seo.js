const setMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content || '')
}

// Updates the document head for the current page. `settingsPages` are the admin-managed SEO entries.
export function applySeo({ title, description, image, type = 'website', jsonLd } = {}) {
  const url = `${window.location.origin}${window.location.pathname}${window.location.search ? '' : ''}`
  if (title) document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:type', type)
  setMeta('property', 'og:url', url)
  if (image) setMeta('property', 'og:image', image)
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
  link.href = url // query strings (filters, pages) are not part of the canonical URL
  let ld = document.head.querySelector('script[data-seo="ld"]')
  if (jsonLd) {
    if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.dataset.seo = 'ld'; document.head.appendChild(ld) }
    ld.textContent = JSON.stringify(jsonLd)
  } else ld?.remove()
}

// Finds the admin-managed SEO entry for a path such as "/" or "/shop?category=laptops".
export const seoFor = (pages = [], path) => pages.find((p) => p.path === path)
