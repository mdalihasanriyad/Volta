import { Router } from 'express'
import * as c from '../../controllers/authController.js'
import { requireUser } from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/security.js'
import { validate } from '../../middleware/validate.js'
import { googleSchema, changePasswordSchema, forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, tokenSchema } from '../../validators/auth.js'

const r = Router()
r.post('/register', authLimiter, validate(registerSchema), c.register)
r.post('/login', authLimiter, validate(loginSchema), c.login)
r.post('/google', authLimiter, validate(googleSchema), c.google)
r.post('/logout', c.logout)
r.post('/refresh', c.refresh)
r.get('/me', c.me)
r.post('/verify-email', authLimiter, validate(tokenSchema), c.verifyEmail)
r.post('/resend-verification', authLimiter, requireUser, c.resendVerification)
r.post('/forgot-password', authLimiter, validate(forgotSchema), c.forgotPassword)
r.post('/reset-password', authLimiter, validate(resetSchema), c.resetPassword)
r.patch('/password', authLimiter, requireUser, validate(changePasswordSchema), c.changePassword)
r.patch('/profile', requireUser, validate(profileSchema), c.updateProfile)
export default r
