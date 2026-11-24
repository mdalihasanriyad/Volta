import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const cartSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: ObjectId, ref: 'Product', required: true },
    variant: { type: ObjectId, ref: 'ProductVariant' },
    color: String,
    quantity: { type: Number, required: true, min: 1, max: 10 },
    _id: false,
  }],
  couponCode: String,
}, { timestamps: true })

export default mongoose.models.Cart || mongoose.model('Cart', cartSchema)
