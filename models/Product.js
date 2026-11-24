import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  brand: { type: ObjectId, ref: 'Brand', index: true },
  brandName: { type: String, index: true }, // denormalised for search and listing
  category: { type: ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: String, trim: true },
  description: { type: String, maxlength: 10000 },
  images: [{ url: String, publicId: String, alt: String, _id: false }],
  price: { type: Number, required: true, min: 0 },        // base currency (BDT)
  compareAtPrice: { type: Number, min: 0 },               // original price, for discounts
  discountPercent: { type: Number, default: 0, index: true },
  stock: { type: Number, default: 0, min: 0 },            // total across SKUs; Inventory is the source of truth
  hasVariants: { type: Boolean, default: false },
  colors: [{ name: String, hex: String, _id: false }],
  specs: { type: Map, of: String },
  status: { type: String, enum: ['active', 'draft'], default: 'draft', index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  soldCount: { type: Number, default: 0, min: 0 },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  seo: { title: String, description: String },
}, { timestamps: true })

productSchema.index({ status: 1, category: 1, price: 1 })
productSchema.index({ status: 1, createdAt: -1 })
productSchema.index({ status: 1, soldCount: -1 })
productSchema.index({ status: 1, ratingCount: -1 })
productSchema.index({ name: 'text', sku: 'text', brandName: 'text' })

export default mongoose.models.Product || mongoose.model('Product', productSchema)
