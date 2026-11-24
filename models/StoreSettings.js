import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  storeName: { type: String, default: 'Volta' },
  email: String, phone: String, address: String,
  announcement: { type: String, default: '' },
  lowStockThreshold: { type: Number, default: 8 },
  maintenance: { type: Boolean, default: false },
  homepageSections: [{ key: String, label: String, visible: { type: Boolean, default: true }, _id: false }],
  seoPages: [{ page: String, path: String, title: String, description: String, _id: false }],
  security: { sessionMinutes: { type: Number, default: 60 }, maxFailedLogins: { type: Number, default: 5 }, requireStrongPasswords: { type: Boolean, default: true } },
}, { timestamps: true })

export default mongoose.models.StoreSettings || mongoose.model('StoreSettings', settingsSchema)
