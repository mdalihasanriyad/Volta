// Vercel serverless entry. vercel.json rewrites /api/* here; Express then routes the original URL.
import app from './app.js'
import { connectDB } from '../config/db.js'

export default async function handler(req, res) {
  try {
    await connectDB()
  } catch (err) {
    console.error('[db] connection failed:', err.message)
    return res.status(503).json({ message: 'Service temporarily unavailable.' })
  }
  return app(req, res)
}
