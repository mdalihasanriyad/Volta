import { useState } from 'react'

// Pass `server={{ page, pages, total, onPage }}` for server-side pagination; otherwise rows are paged in the browser.
export default function DataTable({ columns, rows, pageSize = 10, actions, empty = 'Nothing here yet.', server }) {
  const [page, setPage] = useState(1)
  const pages = server ? server.pages : Math.max(1, Math.ceil(rows.length / pageSize))
  const cur = server ? server.page : Math.min(page, pages)
  const total = server ? server.total : rows.length
  const go = server ? server.onPage : setPage
  const view = server ? rows : rows.slice((cur - 1) * pageSize, cur * pageSize)
  // an empty list shows a plain message (a wide table would clip it on phones)
  if (view.length === 0) return <div className="card px-4 py-10 text-center text-sm text-gray-500">{empty}</div>
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-bold text-gray-500">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className="px-4 py-3">{c.label}</th>)}{actions && <th scope="col" className="px-4 py-3 text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                {columns.map((c) => <td key={c.key} className="px-4 py-3 align-middle">{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>)}
                {actions && <td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2">{actions(r)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
          <span className="text-gray-500">{total} records · page {cur} of {pages}</span>
          <div className="flex gap-2"><button type="button" className="btn-outline !py-1.5" disabled={cur === 1} onClick={() => go(cur - 1)}>Previous</button><button type="button" className="btn-outline !py-1.5" disabled={cur === pages} onClick={() => go(cur + 1)}>Next</button></div>
        </div>
      )}
    </div>
  )
}
