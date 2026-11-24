import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: String,
  position: { type: String, enum: ['hero', 'promo'], default: 'hero', index: true },
  image: { url: String, publicId: String, alt: String },
  ctaLabel: String,
  link: { type: String, default: '/shop' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })
bannerSchema.index({ isActive: 1, position: 1, order: 1 })

export default mongoose.models.Banner || mongoose.model('Banner', bannerSchema)
