import mongoose from 'mongoose'

// Permissions a Super Admin may grant. Financial reports, coupons, shipping, currency, SEO, content,
// settings, admin management and logs are always Super Admin only (enforced in middleware/authAdmin.js).
export const ASSIGNABLE_PERMISSIONS = ['orders', 'customers', 'products', 'inventory', 'categories', 'banners', 'reviews']

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin', index: true },
  permissions: { type: [{ type: String, enum: ASSIGNABLE_PERMISSIONS }], default: [] },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  tokenVersion: { type: Number, default: 0 },
  failedLogins: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
  lastActiveAt: Date, // updated at sign-in and on every silent refresh; used for the idle timeout setting
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true })

export default mongoose.models.Admin || mongoose.model('Admin', adminSchema)
