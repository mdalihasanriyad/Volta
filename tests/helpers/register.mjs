// Preloaded with `node --import` (see "test" in package.json). Replaces the real database/web packages with small in-memory
// stand-ins so the application's own code (routes, middleware, services) can be exercised without a network or a database.
import { register } from 'node:module'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef0123456789'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef012345'
process.env.MONGODB_URI = 'mongodb://stub/test'
process.env.CLIENT_URL = 'https://shop.example'
register('./stubHooks.mjs', import.meta.url)
