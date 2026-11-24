import mongoose from 'mongoose'

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.models.Newsletter || mongoose.model('Newsletter', newsletterSchema)
