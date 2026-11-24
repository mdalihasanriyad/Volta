import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  maxDiscount: { type: Number, default: 0 },
  minPurchase: { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 },   // 0 = unlimited
  perUserLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  startsAt: Date,
  expiresAt: Date,
  appliesTo: { type: { type: String, enum: ['all', 'products', 'categories'], default: 'all' }, ids: [{ type: ObjectId }] },
  campaign: String,
  active: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Coupon || mongoose.model('Coupon', couponSchema)
