import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const wishlistSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true, unique: true },
  products: [{ type: ObjectId, ref: 'Product' }],
}, { timestamps: true })

export default mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema)
