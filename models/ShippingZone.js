import mongoose from 'mongoose'

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  countries: { type: [String], required: true, validate: (v) => v.length > 0 }, // ISO codes or "*"
  regions: { type: [String], default: [] },       // cities/regions; empty = whole country
  baseFee: { type: Number, required: true, min: 0 },
  expressFee: { type: Number, min: 0, default: null },
  freeThreshold: { type: Number, default: 0, min: 0 },
  eta: String,
  codAvailable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.ShippingZone || mongoose.model('ShippingZone', zoneSchema)
