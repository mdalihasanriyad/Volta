import mongoose from 'mongoose'
const { ObjectId } = mongoose.Schema.Types

// One record per sellable SKU (a simple product, or each variant). This is the single source of truth for stock.
const inventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true },
  product: { type: ObjectId, ref: 'Product', required: true, index: true },
  variant: { type: ObjectId, ref: 'ProductVariant' },
  quantity: { type: Number, required: true, default: 0, min: 0 }, // never negative (schema + conditional updates)
  reorderLevel: { type: Number, default: 8, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
}, { timestamps: true })
inventorySchema.index({ quantity: 1 })

export default mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema)
