import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

// Append-only audit trail for every stock change.
const movementSchema = new mongoose.Schema({
  sku: { type: String, required: true, index: true },
  product: { type: ObjectId, ref: 'Product' },
  type: { type: String, enum: ['initial', 'stock_in', 'stock_out', 'adjustment', 'sale', 'cancel_restore'], required: true },
  quantity: { type: Number, required: true }, // signed: +in, -out
  balanceAfter: { type: Number, required: true },
  reason: String,
  reference: String, // order number, supplier note
  admin: { type: ObjectId, ref: 'Admin' },
  adminName: String,
}, { timestamps: { createdAt: true, updatedAt: false } })
movementSchema.index({ createdAt: -1 })

export default mongoose.models.StockMovement || mongoose.model('StockMovement', movementSchema)
