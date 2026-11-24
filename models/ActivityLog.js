import mongoose from 'mongoose'

const logSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  adminName: String,
  action: { type: String, required: true },
  entity: String,
  entityId: String,
  meta: mongoose.Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } })
logSchema.index({ createdAt: -1 })

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', logSchema)
