import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const stubs = new URL('../stubs/', import.meta.url)
const MAP = {
  mongoose: 'mongoose.mjs', express: 'express.mjs', jsonwebtoken: 'jsonwebtoken.mjs', bcryptjs: 'bcryptjs.mjs', helmet: 'passthrough.mjs',
  cors: 'passthrough.mjs', 'cookie-parser': 'passthrough.mjs', 'express-rate-limit': 'passthrough.mjs', dotenv: 'empty.mjs', 'dotenv/config': 'empty.mjs',
}
const OFFLINE_ZOD = '/opt/npm-tools/node_modules/zod/index.js' // only used when zod is not installed (offline sandbox)

export async function resolve(specifier, context, nextResolve) {
  if (MAP[specifier]) return { url: new URL(MAP[specifier], stubs).href, shortCircuit: true }
  try { return await nextResolve(specifier, context) } catch (err) {
    if (specifier === 'zod' && existsSync(OFFLINE_ZOD)) return { url: pathToFileURL(OFFLINE_ZOD).href, shortCircuit: true }
    throw err
  }
}
