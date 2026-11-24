import mongoose from 'mongoose'

// rate = amount of this currency equal to 1 unit of the base currency (BDT). Set only by a Super Admin.
const currencySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, minlength: 3, maxlength: 3 },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  rate: { type: Number, required: true, min: 0 },
  decimals: { type: Number, default: 2, min: 0, max: 4 },
  isBase: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.Currency || mongoose.model('Currency', currencySchema)
