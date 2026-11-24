const norm = (s) => String(s || '').trim().toLowerCase()

// A zone lists countries (ISO codes or "*") and optional regions/cities. Region-specific zones win over generic ones.
export function findZone(zones, country, city) {
  const c = String(country || '').toUpperCase()
  const active = zones.filter((z) => z.isActive !== false && (z.countries.map((x) => x.toUpperCase()).includes(c) || z.countries.includes('*')))
  const exactCountry = (z) => z.countries.map((x) => x.toUpperCase()).includes(c)
  const specific = active.find((z) => exactCountry(z) && z.regions?.length && z.regions.some((r) => norm(r) === norm(city)))
  if (specific) return specific
  const generic = active.find((z) => exactCountry(z) && !(z.regions?.length))
  if (generic) return generic
  return active.find((z) => z.countries.includes('*') && !(z.regions?.length)) || null
}
