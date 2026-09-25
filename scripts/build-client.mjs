/**
 * Bundle the browser entry (`src/client.ts`) into `public/static/app.js`.
 *
 * The client imports `computeFinancials` from `src/engine.ts`, so the bundle is
 * what guarantees the browser and the Worker run identical maths. esbuild is
 * already present as a Vite dependency; this keeps the build to one extra step
 * with no additional toolchain.
 */
import { build } from 'esbuild'
import { statSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const outfile = resolve('public/static/app.js')

mkdirSync(dirname(outfile), { recursive: true })

const result = await build({
  entryPoints: [resolve('src/client.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  target: ['es2022', 'chrome110', 'firefox110', 'safari16'],
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
  metafile: true,
})

const bytes = statSync(outfile).size
const inputs = Object.keys(result.metafile.inputs).length
console.log(`[client] public/static/app.js — ${(bytes / 1024).toFixed(1)} kB from ${inputs} modules`)
