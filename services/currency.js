// Prices are stored in the base currency (BDT). `rate` = how much of the target currency 1 BDT is worth.
// Rates always come from the database (set by a Super Admin); nothing here invents a rate.
export function convertFromBase(amountBase, currency) {
  if (!currency || !(currency.rate > 0)) throw new Error('A valid exchange rate is required')
  const f = 10 ** (currency.decimals ?? 2)
  return Math.round(amountBase * currency.rate * f) / f
}
export const currencySnapshot = (c) => ({ code: c.code, symbol: c.symbol, rate: c.rate, decimals: c.decimals })
