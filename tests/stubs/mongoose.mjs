// In-memory stand-in for mongoose. Each model name maps to ONE persistent plain object, so tests can attach fake
// query methods (find, findOneAndUpdate ...) to it. Transactions keep an undo log that is replayed when the callback throws.
class Schema {
  constructor(def, opts = {}) { this.def = def; this.opts = opts; this.indexes = [] }
  index(fields, opts = {}) { this.indexes.push([fields, opts]); return this }
  static Types = { ObjectId: 'ObjectId', Mixed: 'Mixed' }
}
const registry = {}
const model = (name, schema) => { const m = (registry[name] ||= { modelName: name }); if (schema) m.schema = schema; return m }

const mongoose = {
  Schema,
  models: {}, // always empty, so `mongoose.models.X || mongoose.model('X', ...)` takes the second branch
  model,
  set() {},
  connection: { readyState: 1 },
  async connect() { return mongoose },
  async disconnect() {},
  async startSession() {
    const session = {
      undo: [],
      async withTransaction(fn) {
        session.undo = []
        try { await fn() } catch (e) {
          for (const u of session.undo.reverse()) u()
          session.undo = []
          throw e
        }
      },
      endSession() {},
    }
    return session
  },
}
export default mongoose
export { Schema }
