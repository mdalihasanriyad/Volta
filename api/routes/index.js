import { Router } from 'express'
import mongoose from 'mongoose'
import auth from './auth.js'
import store from './store.js'
import customer from './customer.js'
import admin from './admin.js'

const r = Router()
r.get('/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }))
r.use('/auth', auth)
r.use('/admin', admin)
r.use('/catalog', store)
r.use('/', customer) // /addresses /cart /wishlist /checkout/quote /orders /reviews
export default r
