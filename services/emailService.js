import { env } from '../config/env.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const money = (n, o) => `${o?.symbol || '৳'}${Number(n).toLocaleString('en-US', { minimumFractionDigits: o?.decimals ?? 0, maximumFractionDigits: o?.decimals ?? 0 })}`

function layout(title, body) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
  <div style="background:#111827;padding:16px 24px"><span style="color:#38BDF8;font-size:20px;font-weight:bold">Volta</span></div>
  <div style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}</div>
  <p style="padding:0 24px 24px;color:#6B7280;font-size:12px">You received this email because of activity on your Volta account.</p></div>`
}
const button = (href, label) => `<p><a href="${esc(href)}" style="background:#0284C7;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${esc(label)}</a></p>`

// Sends through Resend's REST API. Never throws: a failed email must not fail an order or sign-up.
export async function sendEmail({ to, subject, html }) {
  if (!env.resendKey || !env.emailFrom) {
    if (!env.isProd) console.log(`[email not sent: RESEND_API_KEY / EMAIL_FROM missing]\n  to: ${to}\n  subject: ${subject}\n  ${html.match(/href="([^"]+)"/)?.[1] || ''}`)
    return false
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to, subject, html }),
    })
    if (!r.ok) console.error('[email] Resend responded', r.status)
    return r.ok
  } catch (e) { console.error('[email] failed', e.message); return false }
}

export const emails = {
  verify: (user, token) => sendEmail({ to: user.email, subject: 'Verify your email', html: layout(`Welcome, ${user.name.split(' ')[0]}`, `<p>Confirm your email address to start ordering.</p>${button(`${env.clientUrl}/verify-email?token=${token}`, 'Verify email')}<p style="color:#6B7280;font-size:13px">This link expires in 24 hours.</p>`) }),
  reset: (user, token) => sendEmail({ to: user.email, subject: 'Reset your password', html: layout('Reset your password', `<p>Use the button below to choose a new password. If you did not ask for this, ignore this email.</p>${button(`${env.clientUrl}/reset-password?token=${token}`, 'Choose a new password')}<p style="color:#6B7280;font-size:13px">This link expires in 1 hour.</p>`) }),
  orderConfirmation: (order) => sendEmail({ to: order.customer.email, subject: `Order ${order.number} confirmed`, html: layout(`Thanks for your order, ${order.customer.name.split(' ')[0]}`,
    `<p>Order <b>${esc(order.number)}</b> is confirmed. Payment: Cash on Delivery.</p><ul>${order.items.map((i) => `<li>${i.quantity} × ${esc(i.name)} (${money(i.unitPrice)})</li>`).join('')}</ul><p>Total to pay on delivery: <b>${money(order.totalDisplay, order.currency)}</b> (${esc(order.currency.code)})</p>${button(`${env.clientUrl}/order-tracking?order=${order.number}`, 'Track your order')}`) }),
  orderStatus: (order) => sendEmail({ to: order.customer.email, subject: `Order ${order.number}: ${order.status}`, html: layout(`Your order is ${order.status.toLowerCase()}`,
    `<p>Order <b>${esc(order.number)}</b> is now <b>${esc(order.status)}</b>.</p>${order.tracking ? `<p>Tracking reference: <b>${esc(order.tracking)}</b></p>` : ''}${button(`${env.clientUrl}/order-tracking?order=${order.number}`, 'Track your order')}`) }),
}
