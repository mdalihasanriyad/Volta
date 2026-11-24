import { ActivityLog, Notification } from '../models/index.js'

export function logActivity(req, action, entity, entityId, meta) {
  const a = req.admin
  return ActivityLog.create({ admin: a?._id, adminName: a?.name, action, entity, entityId: entityId ? String(entityId) : undefined, meta, ip: req.ip })
    .catch((e) => console.error('[audit] failed', e.message)) // auditing must not break the request
}

export const notifyAdmins = (type, message, link) =>
  Notification.create({ type, message, link }).catch((e) => console.error('[notify] failed', e.message))
