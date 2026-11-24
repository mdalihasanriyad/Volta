import mongoose from 'mongoose'

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  logo: { url: String, publicId: String },
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Brand || mongoose.model('Brand', brandSchema)
