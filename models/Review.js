import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const reviewSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true, index: true },
  user: { type: ObjectId, ref: 'User', required: true },
  order: { type: ObjectId, ref: 'Order', required: true },
  userName: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
}, { timestamps: true })
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true }) // one review per purchase

export default mongoose.models.Review || mongoose.model('Review', reviewSchema)
