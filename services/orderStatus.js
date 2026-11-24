// Pure order-status rules (no DB) so they can be tested in isolation.
export const FLOW = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered']
export const ALL_STATUSES = [...FLOW, 'Cancelled', 'Returned']

export function canTransition(from, to) {
  if (from === to || !ALL_STATUSES.includes(to) || !ALL_STATUSES.includes(from)) return false
  if (from === 'Cancelled' || from === 'Returned') return false
  if (to === 'Cancelled') return FLOW.indexOf(from) < FLOW.indexOf('Shipped') // after shipping use Returned
  if (to === 'Returned') return ['Shipped', 'Out for Delivery', 'Delivered'].includes(from)
  return FLOW.indexOf(to) > FLOW.indexOf(from)
}
export const customerCanCancel = (status) => status === 'Pending' || status === 'Confirmed'
export const restocksOnCancel = (from) => FLOW.indexOf(from) < FLOW.indexOf('Shipped')
