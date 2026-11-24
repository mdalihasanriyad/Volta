import mongoose from 'mongoose'

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, default: 'Home' },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  country: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
  city: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  postcode: String,
  isDefault: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.models.Address || mongoose.model('Address', addressSchema)
