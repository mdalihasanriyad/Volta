import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  order: { type: Number, default: 0 },
  icon: String,
  image: { url: String, publicId: String },
  isActive: { type: Boolean, default: true },
  seo: { title: String, description: String },
}, { timestamps: true })
categorySchema.index({ isActive: 1, order: 1 })

export default mongoose.models.Category || mongoose.model('Category', categorySchema)
