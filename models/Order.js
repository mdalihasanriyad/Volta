import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

const itemSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: 'Product', required: true },
  variant: { type: ObjectId, ref: 'ProductVariant' },
  sku: String, name: String, image: String, color: String, model: String,
  unitPrice: { type: Number, required: true },  // price snapshot (BDT)
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  user: { type: ObjectId, ref: 'User', required: true, index: true },
  customer: { name: String, email: String, phone: String },
  items: { type: [itemSchema], validate: (v) => v.length > 0 },
  shippingAddress: { fullName: String, phone: String, country: String, city: String, line1: String, postcode: String },
  delivery: { zone: String, method: { type: String, enum: ['standard', 'express'] }, eta: String },
  // Snapshot of the currency and rate used at checkout. Never updated afterwards.
  currency: { code: String, symbol: String, rate: Number, decimals: Number },
  subtotal: Number, discount: { type: Number, default: 0 }, couponCode: String, shippingFee: Number,
  total: { type: Number, required: true },            // BDT (base)
  totalDisplay: Number,                               // total in the order currency, frozen at checkout
  payment: { method: { type: String, enum: ['COD'], default: 'COD' }, status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' } },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'], default: 'Pending', index: true },
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: String, _id: false }],
  tracking: String,
  internalNote: String,
  deliveredAt: Date,
  returnRequest: { status: { type: String, enum: ['requested', 'approved', 'rejected'] }, reason: String, at: Date },
  refund: { status: { type: String, enum: ['none', 'pending', 'refunded'], default: 'none' } },
}, { timestamps: true })

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ 'customer.phone': 1 })

export default mongoose.models.Order || mongoose.model('Order', orderSchema)
