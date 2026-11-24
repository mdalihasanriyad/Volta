import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const variantSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true, index: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, trim: true },       // e.g. "256GB / Sky Blue"
  color: String,
  model: String,
  price: { type: Number, min: 0 },          // overrides product price when set
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.ProductVariant || mongoose.model('ProductVariant', variantSchema)
