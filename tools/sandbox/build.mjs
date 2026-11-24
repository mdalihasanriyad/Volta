// Builds the storefront + admin app for the offline sandbox: esbuild bundle (with shimmed libraries), Tailwind v4 CSS, index.html.
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js'
import { compile } from '/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const out = path.join(here, 'dist')
const TW = '/opt/npm-tools/node_modules/tailwindcss'
rmSync(out, { recursive: true, force: true }); mkdirSync(path.join(out, 'assets'), { recursive: true })

const walk = (d, o = []) => { for (const f of readdirSync(d)) { const p = path.join(d, f); statSync(p).isDirectory() ? walk(p, o) : /\.(jsx?|html)$/.test(f) && o.push(p) } return o }
const files = [...walk(path.join(root, 'src')), path.join(root, 'index.html')]

// lucide-react shim: one simple SVG component per icon the app imports
const icons = new Set()
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach((n) => icons.add(n))
writeFileSync(path.join(here, 'shims/lucide-react.jsx'), `const make = (name) => ({ size = 24, strokeWidth = 2, className, style, 'aria-label': al, ...rest }) => (
  <svg data-icon={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={className} style={style} aria-hidden={al ? undefined : true} aria-label={al} {...rest}><rect x="4" y="4" width="16" height="16" rx="4" /></svg>)
${[...icons].map((n) => `export const ${n} = make('${n}')`).join('\n')}\n`)

const alias = Object.fromEntries([['zustand', 'zustand.js'], ['zustand/middleware', 'zustand-middleware.js'], ['axios', 'axios.js'], ['react-router-dom', 'react-router-dom.js'], ['react-hook-form', 'react-hook-form.jsx'], ['lucide-react', 'lucide-react.jsx']].map(([k, v]) => [k, path.join(here, 'shims', v)]))
const result = await build({
  entryPoints: { main: path.join(root, 'src/main.jsx') }, outdir: path.join(out, 'assets'), bundle: true, format: 'esm', splitting: true, minify: false, sourcemap: false,
  jsx: 'automatic', loader: { '.js': 'jsx' }, alias, nodePaths: ['/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"production"' }, metafile: true, logLevel: 'warning',
})
writeFileSync(path.join(out, 'meta.json'), JSON.stringify(result.metafile))

// Tailwind v4 CSS from the project's index.css (v3 directives and config translated for the sandbox compiler)
let css = readFileSync(path.join(root, 'src/index.css'), 'utf8').replace(/@media print[\s\S]*$/, (m) => m)
const printBlock = css.match(/@media print[\s\S]*$/)?.[0] || ''
css = css.replace(printBlock, '')
const components = css.match(/@layer components \{([\s\S]*?)\n\}\n?/)?.[1] || ''
css = css.replace(/@layer components \{[\s\S]*?\n\}\n?/, '')
const utilities = [], plain = []
for (const m of components.matchAll(/\.([\w-]+)(::[\w-]+)?\s*\{([^{}]*)\}/g)) (m[2] ? plain : utilities).push(m[2] ? `.${m[1]}${m[2]} {${m[3]}}` : `@utility ${m[1]} {${m[3]}}`)
css = css.replace(/@tailwind base;\s*@tailwind components;\s*@tailwind utilities;/, `@import "tailwindcss";
@theme { --color-brand: #38BDF8; --color-brand-deep: #0284C7; --color-brand-soft: #E0F2FE; --color-ink: #111827; --font-sans: Manrope, system-ui, sans-serif; --shadow-card: 0 1px 2px rgba(17,24,39,.05), 0 4px 16px -6px rgba(17,24,39,.10); }
@layer base { *, ::after, ::before { border-color: var(--color-gray-200); } button { cursor: pointer; } }
${utilities.join('\n')}`) + '\n' + plain.join('\n') + '\n' + printBlock
const loadStylesheet = async (id, base) => {
  const map = { tailwindcss: 'index.css', 'tailwindcss/preflight': 'preflight.css', 'tailwindcss/theme': 'theme.css', 'tailwindcss/utilities': 'utilities.css' }
  const p = map[id] ? path.join(TW, map[id]) : path.resolve(base, id)
  return { path: p, base: path.dirname(p), content: readFileSync(p, 'utf8') }
}
const compiler = await compile(css, { base: root, loadStylesheet })
const candidates = new Set()
for (const f of files) for (const t of readFileSync(f, 'utf8').split(/[\s"'`<>{}=,;]+/)) if (t && /[a-z]/i.test(t)) candidates.add(t)
writeFileSync(path.join(out, 'assets/main.css'), compiler.build([...candidates]))

writeFileSync(path.join(out, 'index.html'), readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<link[^>]*fonts\.g[^>]*>\s*/g, '').replace('<script type="module" src="/src/main.jsx"></script>', '<link rel="stylesheet" href="/assets/main.css" /><script type="module" src="/assets/main.js"></script>'))
copyFileSync(path.join(root, 'public/favicon.svg'), path.join(out, 'favicon.svg'))
const sizes = Object.entries(result.metafile.outputs).filter(([k]) => k.endsWith('.js')).map(([k, v]) => [path.basename(k), v.bytes])
console.log('built', sizes.length, 'js files;', 'css', Math.round(readFileSync(path.join(out, 'assets/main.css')).length / 1024) + 'KB;', 'icons', icons.size)
