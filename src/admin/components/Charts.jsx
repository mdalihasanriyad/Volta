const fmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v))

export function BarChart({ labels, values, height = 220 }) {
  const w = 600, pad = { l: 40, r: 8, t: 10, b: 24 }
  const max = Math.max(...values) * 1.1 || 1
  const bw = (w - pad.l - pad.r) / values.length
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Bar chart">
      {[0, 0.5, 1].map((t) => { const y = pad.t + (height - pad.t - pad.b) * (1 - t); return <g key={t}><line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#E5E7EB" /><text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6B7280">{fmt(max * t)}</text></g> })}
      {values.map((v, i) => { const h = (height - pad.t - pad.b) * (v / max); return <g key={i}><rect x={pad.l + i * bw + bw * 0.2} y={height - pad.b - h} width={bw * 0.6} height={h} rx="3" fill="#0284C7" /><text x={pad.l + i * bw + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#6B7280">{labels[i]}</text></g> })}
    </svg>
  )
}

export function LineChart({ labels, values, height = 220 }) {
  const w = 600, pad = { l: 40, r: 12, t: 10, b: 24 }
  const max = Math.max(...values) * 1.1 || 1
  const step = (w - pad.l - pad.r) / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [pad.l + i * step, pad.t + (height - pad.t - pad.b) * (1 - v / max)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0]},${height - pad.b} L${pts[0][0]},${height - pad.b} Z`
  const every = Math.ceil(labels.length / 8)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Line chart">
      {[0, 0.5, 1].map((t) => { const y = pad.t + (height - pad.t - pad.b) * (1 - t); return <g key={t}><line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#E5E7EB" /><text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6B7280">{fmt(max * t)}</text></g> })}
      <path d={area} fill="#38BDF8" opacity="0.18" />
      <path d={line} fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0284C7" />)}
      {labels.map((l, i) => i % every === 0 && <text key={i} x={pad.l + i * step} y={height - 8} textAnchor="middle" fontSize="10" fill="#6B7280">{l}</text>)}
    </svg>
  )
}
