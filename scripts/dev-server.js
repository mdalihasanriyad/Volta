// Local API server for development: `npm run dev:api` (Vite proxies /api to this port).
import app from '../api/app.js'
import { connectDB } from '../config/db.js'
import { env } from '../config/env.js'

await connectDB()
app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`))
