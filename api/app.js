import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from '../config/env.js'
import routes from './routes/index.js'
import { robots, sitemap } from '../controllers/seoController.js'
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js'
import { apiLimiter, originGuard, sanitizeInput } from '../middleware/security.js'

const app = express()
app.set('trust proxy', 1) // behind Vercel's proxy: needed for correct client IPs in rate limiting
app.disable('x-powered-by')
app.use(helmet())

const allowed = new Set([env.clientUrl, env.apiUrl].filter(Boolean))
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowed.has(origin.replace(/\/$/, ''))), credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '100kb' }))
app.use(sanitizeInput)
// /sitemap.xml and /robots.txt are rewritten to this function by vercel.json
app.get(['/sitemap.xml', '/api/sitemap.xml'], sitemap)
app.get(['/robots.txt', '/api/robots.txt'], robots)
app.use('/api', apiLimiter, originGuard, routes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
