import { asyncHandler } from '../utils/helpers.js'
import { notFound } from '../utils/AppError.js'

// Small CRUD factory for simple admin resources (categories, brands, banners, coupons, zones).
export function crud(Model, { label, sort = { createdAt: -1 }, guardRemove } = {}) {
  return {
    list: asyncHandler(async (req, res) => res.json(await Model.find().sort(sort).lean())),
    create: asyncHandler(async (req, res) => res.status(201).json(await Model.create(req.body))),
    update: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      if (!doc) throw notFound(`${label} not found`)
      res.json(doc)
    }),
    remove: asyncHandler(async (req, res) => {
      if (guardRemove) await guardRemove(req.params.id)
      const doc = await Model.findByIdAndDelete(req.params.id)
      if (!doc) throw notFound(`${label} not found`)
      res.json({ ok: true })
    }),
  }
}
