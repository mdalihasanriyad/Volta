// Regenerates docs/ADMIN_PERMISSIONS.md from the hand-written rules that the permission tests enforce.
import { writeFileSync } from 'node:fs'
import { ADMIN_RULES } from '../tests/helpers/adminRules.mjs'

const groups = {}
for (const [route, rule] of Object.entries(ADMIN_RULES)) {
  const key = rule === 'public' ? 'Public (sign-in only)' : rule === 'admin' ? 'Any signed-in, active admin' : rule === 'super' ? 'Super Admin only' : `Permission: ${[].concat(rule).join(' or ')}`
  ;(groups[key] ||= []).push(route)
}
const order = ['Public (sign-in only)', 'Any signed-in, active admin', ...Object.keys(groups).filter((k) => k.startsWith('Permission')).sort(), 'Super Admin only']
const md = `# Admin access rules

Generated from \`tests/helpers/adminRules.mjs\`. \`npm test\` walks every real route in \`api/routes/admin.js\` with 15 kinds of caller
and fails if any route lets someone in (or keeps someone out) against this table. Run \`node scripts/permissions-doc.mjs\` to refresh this file.

Routes are relative to \`/api/admin\`.

${order.map((k) => `## ${k}\n\n${groups[k].map((r) => `- \`${r}\``).join('\n')}\n`).join('\n')}
## Rules that are enforced on the server

- A **Super Admin** passes every check. A regular **Admin** only passes routes for permissions a Super Admin granted.
- Admin accounts are read from the database on **every request**: suspending an admin, revoking a permission, or bumping their session version takes effect on their next request.
- A customer session cannot be used as an admin session and the other way round (different token audience and cookie).
- Permission checks run **before** request validation, so a denied admin never sees field-level errors.
- Admins cannot create admins, change any admin account (including their own), see financial reports, coupons, shipping, currency, SEO, content, global/security settings or activity logs.
- Cost prices and inventory valuation are Super Admin only: the API strips \`costPrice\` for regular admins and ignores it when they write.
- Dashboard revenue, units sold and best sellers are only included for Super Admins.
- A Super Admin account cannot be created, edited or suspended through the API.
`
writeFileSync(new URL('../docs/ADMIN_PERMISSIONS.md', import.meta.url), md)
console.log('wrote docs/ADMIN_PERMISSIONS.md')
