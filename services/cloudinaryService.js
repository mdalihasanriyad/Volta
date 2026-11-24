import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { AppError, badRequest } from '../utils/AppError.js'

const { cloudName, apiKey, apiSecret } = env.cloudinary
// Cloudinary signature: sha1 of the sorted "key=value" pairs joined with &, followed by the API secret.
export const sign = (params, secret = apiSecret) =>
  crypto.createHash('sha1').update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + secret).digest('hex')

const assertConfigured = () => { if (!cloudName || !apiKey || !apiSecret) throw new AppError(503, 'Image uploads are not configured yet (Cloudinary credentials missing).') }

// The browser uploads straight to Cloudinary using these signed parameters, so large files never pass through the serverless API
// and the API secret never leaves the server. Only image formats are allowed and everything lands under volta/<folder>.
export function signUpload(folder) {
  assertConfigured()
  const params = { allowed_formats: 'jpg,jpeg,png,webp', folder: `volta/${folder}`, timestamp: Math.floor(Date.now() / 1000) }
  return { cloudName, apiKey, ...params, signature: sign(params), uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` }
}

export async function destroyImage(publicId) {
  assertConfigured()
  if (!String(publicId).startsWith('volta/')) throw badRequest('Not an image managed by this store.')
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) }
  const body = new URLSearchParams({ ...params, api_key: apiKey, signature: sign(params) })
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body })
  if (!r.ok) throw new AppError(502, 'Could not delete the image.')
  return r.json()
}
