import mongoose from 'mongoose'

// Admin-facing notifications: new orders, low stock, return requests, system events.
const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['order', 'stock', 'return', 'system'], required: true },
  message: { type: String, required: true },
  link: String,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }],
}, { timestamps: { createdAt: true, updatedAt: false } })
notificationSchema.index({ createdAt: -1 })

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
