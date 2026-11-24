import { ZodError } from 'zod'
import { env } from '../config/env.js'

export const notFoundHandler = (req, res) => res.status(404).json({ message: 'Route not found' })

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {}
    err.issues.forEach((i) => { fields[i.path.join('.') || 'body'] = i.message })
    return res.status(400).json({ message: 'Please check the highlighted fields.', fields })
  }
  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern || {})[0] || 'value'
    return res.status(409).json({ message: `That ${key} is already in use.` })
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier.' })
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Invalid data.', fields: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])) })
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON.' })

  const status = err.status && err.expose ? err.status : 500
  if (status >= 500) console.error('[api error]', req.method, req.originalUrl, err)
  res.status(status).json({
    message: status >= 500 && env.isProd ? 'Something went wrong on our side.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  })
}
