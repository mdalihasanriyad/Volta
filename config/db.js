import mongoose from 'mongoose'
import { env, assertEnv } from './env.js'

// Reuse one connection across serverless invocations (and hot reloads in dev).
const cache = globalThis.__voltaMongo || (globalThis.__voltaMongo = { conn: null, promise: null })

export async function connectDB() {
  if (cache.conn) return cache.conn
  assertEnv()
  mongoose.set('strictQuery', true)
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongoUri, { bufferCommands: false, maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
      .then((m) => m)
      .catch((err) => { cache.promise = null; throw err })
  }
  cache.conn = await cache.promise
  return cache.conn
}
