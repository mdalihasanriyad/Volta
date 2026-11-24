// Cloudinary delivery: ask for an optimised, resized version (f_auto/q_auto/w_N). Other URLs are returned unchanged.
export function imageUrl(url, width = 600) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}
export const imageSrcSet = (url, widths = [320, 640, 960]) =>
  url && url.includes('res.cloudinary.com') ? widths.map((w) => `${imageUrl(url, w)} ${w}w`).join(', ') : undefined
