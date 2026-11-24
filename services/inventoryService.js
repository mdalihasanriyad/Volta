import { Inventory, Product, StockMovement } from '../models/index.js'
import { conflict, notFound } from '../utils/AppError.js'
import { withTransaction } from '../config/transaction.js'
import { notifyAdmins } from './auditService.js'

// The only code that changes stock. A decrease is a single atomic conditional update ("quantity >= n"),
// so two simultaneous orders can never both take the last unit and stock can never go below zero.
export async function changeStock({ sku, delta, type, reason, reference, admin, session }) {
  const filter = delta < 0 ? { sku, quantity: { $gte: -delta } } : { sku }
  const inv = await Inventory.findOneAndUpdate(filter, { $inc: { quantity: delta } }, { new: true, session })
  if (!inv) {
    const exists = await Inventory.exists({ sku }).session(session || null)
    throw exists ? conflict(`Not enough stock for ${sku}.`) : notFound(`Unknown SKU ${sku}.`)
  }
  await Product.updateOne({ _id: inv.product }, { $inc: { stock: delta } }, { session })
  await StockMovement.create([{ sku, product: inv.product, type, quantity: delta, balanceAfter: inv.quantity, reason, reference, admin: admin?._id, adminName: admin?.name }], { session })
  if (delta < 0 && inv.quantity <= inv.reorderLevel && inv.quantity - delta > inv.reorderLevel) {
    notifyAdmins('stock', `${sku} is low on stock (${inv.quantity} left)`, '/admin/inventory')
  }
  return inv
}

export async function adminAdjust(admin, { sku, type, direction, quantity, reason, reorderLevel, costPrice }) {
  const delta = type === 'stock_in' ? quantity : type === 'stock_out' ? -quantity : direction === 'add' ? quantity : -quantity
  return withTransaction(async (session) => {
    const inv = await changeStock({ sku, delta, type, reason, admin, session })
    const extra = {}
    if (reorderLevel !== undefined) extra.reorderLevel = reorderLevel
    if (costPrice !== undefined) extra.costPrice = costPrice
    if (Object.keys(extra).length) await Inventory.updateOne({ _id: inv._id }, extra, { session })
    return inv
  })
}
