// Creates the test accounts the end-to-end specs sign in with. For TEST databases only (refuses NODE_ENV=production).
//   npm run seed && npm run seed:e2e && npm run e2e
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { Address, Admin, User } from '../models/index.js'
import { hashPassword } from '../services/authService.js'

if (env.isProd) throw new Error('Refusing to create test accounts when NODE_ENV=production')
const e = process.env
await connectDB()

const customer = { email: e.E2E_CUSTOMER_EMAIL || 'ana@example.test', password: e.E2E_CUSTOMER_PASSWORD || 'Passw0rd1' }
let user = await User.findOne({ email: customer.email })
if (!user) user = await User.create({ name: 'Ana Rahman', email: customer.email, emailVerified: true, passwordHash: await hashPassword(customer.password) })
else { user.passwordHash = await hashPassword(customer.password); user.emailVerified = true; user.status = 'active'; await user.save() }
await Address.deleteMany({ user: user._id })
await Address.create({ user: user._id, label: 'Home', fullName: 'Ana Rahman', phone: '01711111111', country: 'BD', city: 'Dhaka', line1: 'House 12, Road 5, Dhanmondi', isDefault: true })

const admins = [
  { name: 'Nadia Rahman', email: e.E2E_ADMIN_EMAIL || 'nadia@volta.test', password: e.E2E_ADMIN_PASSWORD || 'NadiaPass123', permissions: ['orders', 'customers', 'products', 'inventory'] },
  { name: 'Imran Hossain', email: e.E2E_LIMITED_ADMIN_EMAIL || 'imran@volta.test', password: e.E2E_LIMITED_ADMIN_PASSWORD || 'ImranPass123', permissions: ['orders'] },
]
for (const a of admins) {
  const doc = await Admin.findOne({ email: a.email })
  if (doc) { doc.passwordHash = await hashPassword(a.password); doc.permissions = a.permissions; doc.status = 'active'; await doc.save() }
  else await Admin.create({ name: a.name, email: a.email, role: 'admin', permissions: a.permissions, passwordHash: await hashPassword(a.password) })
}
console.log('E2E test accounts ready:', [customer.email, ...admins.map((a) => a.email)].join(', '))
await mongoose.disconnect()
