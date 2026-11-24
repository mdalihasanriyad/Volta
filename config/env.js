import 'dotenv/config'

const e = process.env
const trim = (u) => (u || '').replace(/\/$/, '')

export const env = {
  nodeEnv: e.NODE_ENV || 'development',
  isProd: e.NODE_ENV === 'production',
  port: Number(e.PORT) || 5000,
  mongoUri: e.MONGODB_URI || '',
  jwtSecret: e.JWT_SECRET || '',
  jwtRefreshSecret: e.JWT_REFRESH_SECRET || '',
  clientUrl: trim(e.CLIENT_URL) || 'http://localhost:5173',
  apiUrl: trim(e.API_URL),
  googleClientId: e.GOOGLE_CLIENT_ID || '',
  googleClientSecret: e.GOOGLE_CLIENT_SECRET || '',
  cloudinary: { cloudName: e.CLOUDINARY_CLOUD_NAME || '', apiKey: e.CLOUDINARY_API_KEY || '', apiSecret: e.CLOUDINARY_API_SECRET || '' },
  resendKey: e.RESEND_API_KEY || '',
  emailFrom: e.EMAIL_FROM || '',
  defaultCurrency: (e.DEFAULT_CURRENCY || 'BDT').toUpperCase(),
}

// No insecure fallbacks: the API refuses to start without real secrets.
export function assertEnv() {
  const missing = []
  if (!env.mongoUri) missing.push('MONGODB_URI')
  if (env.jwtSecret.length < 32) missing.push('JWT_SECRET (min 32 chars)')
  if (env.jwtRefreshSecret.length < 32) missing.push('JWT_REFRESH_SECRET (min 32 chars)')
  if (missing.length) throw new Error(`Missing or weak environment variables: ${missing.join(', ')}`)
}
