import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, index: true, sparse: true },
  avatar: String,
  emailVerified: { type: Boolean, default: false },
  verifyTokenHash: { type: String, select: false },
  verifyExpires: { type: Date, select: false },
  resetTokenHash: { type: String, select: false },
  resetExpires: { type: Date, select: false },
  status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
  tokenVersion: { type: Number, default: 0 }, // bump to sign the user out everywhere
  failedLogins: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
}, { timestamps: true })

export default mongoose.models.User || mongoose.model('User', userSchema)
