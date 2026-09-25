import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { computeFinancials, DEFAULT_OPTIONS, normalizeData } from './engine'
import type { EngineOptions } from './engine'
import { CATEGORIES, DEBT_TYPE_LABELS, SAMPLE_DATA } from './sample'
import { renderer } from './renderer'
import type { HonchoyData } from './types'

/** The dashboard shell — the client app mounts into #app. */
const Shell = () => {
  return (
    <>
      <header class="topbar">
        <div class="topbar__inner">
          <a class="brand" href="/" aria-label="$honchoy home">
            <span class="brand__mark" aria-hidden="true">
              $
            </span>
            <span class="brand__name">$honchoy</span>
          </a>
          <nav class="nav" id="nav" aria-label="Sections"></nav>
          <div class="topbar__side">
            <label class="sr-only" for="currency-select">
              Currency
            </label>
            <select id="currency-select" class="select select--compact"></select>
          </div>
        </div>
      </header>

      <p class="banner" id="storage-banner" hidden>
        This browser blocks local storage, so your changes will not be kept after you close the tab.
        Use <strong>Data → Download JSON</strong> to save a copy.
      </p>

      <main id="main" class="page" tabindex={-1}>
        <div id="app">
          <p class="muted">Loading $honchoy…</p>
        </div>
      </main>

      <footer class="footer">
        <p>
          $honchoy gives you a plan, not financial advice. Numbers are your own estimates — check
          them against your loan contracts.
        </p>
      </footer>

      <div id="toast" class="toast" hidden role="status" aria-live="polite"></div>

      <dialog id="modal" class="modal">
        <div class="modal__head">
          <h2 class="modal__title" id="modal-title"></h2>
          <button type="button" class="icon-btn" id="modal-close" aria-label="Close">
            ✕
          </button>
        </div>
        <div class="modal__body" id="modal-body"></div>
      </dialog>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * The Worker
 * ------------------------------------------------------------------ */

const app = new Hono()

app.use(renderer)
app.use('/api/*', cors())

// Static assets: `public/static/*` is served from `/static/*`.
app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './public/static/favicon.svg' }))

/** Liveness probe used by the sandbox/preview tooling. */
app.get('/api/health', (c) =>
  c.json({ ok: true, app: '$honchoy', engine: 'computeFinancials', time: new Date().toISOString() }),
)

/**
 * The calculation endpoint.
 *
 * The same engine runs in the browser for instant feedback; this endpoint
 * exists so the maths can also be driven from a script, a test or another
 * client. POST the snapshot (or send nothing to use the sample) and get back
 * the full analysis.
 */
app.post('/api/calculate', async (c) => {
  let body: { data?: unknown; options?: Partial<EngineOptions>; now?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    // Empty body is fine — fall through to the sample dataset.
  }
  const analysis = computeFinancials({
    data: body.data ?? SAMPLE_DATA,
    options: body.options,
    now: body.now,
  })
  return c.json(analysis)
})

/** Static reference data the client app needs: samples, categories, labels. */
app.get('/api/meta', (c) =>
  c.json({
    app: '$honchoy',
    version: '1.0.0',
    defaultOptions: DEFAULT_OPTIONS,
    categories: CATEGORIES,
    debtTypes: Object.entries(DEBT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    sample: SAMPLE_DATA,
    incomeTypes: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 weeks' },
      { value: 'annual', label: 'Yearly' },
    ],
  }),
)

/**
 * Validate a snapshot without analysing it. Handy for the importer so the UI
 * can report what was rejected instead of silently dropping rows.
 */
app.post('/api/validate', async (c) => {
  let body: { data?: unknown } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Body must be JSON.' }, 400)
  }
  const incoming = body.data
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return c.json({ ok: false, error: 'Expected a $honchoy object.' }, 400)
  }
  const cleaned: HonchoyData = normalizeData(incoming)
  const raw = incoming as Partial<HonchoyData>
  const dropped = {
    expenses: (Array.isArray(raw.expenses) ? raw.expenses.length : 0) - cleaned.expenses.length,
    debts: (Array.isArray(raw.debts) ? raw.debts.length : 0) - cleaned.debts.length,
    goals: (Array.isArray(raw.goals) ? raw.goals.length : 0) - cleaned.goals.length,
    logs: (Array.isArray(raw.logs) ? raw.logs.length : 0) - cleaned.logs.length,
  }
  return c.json({
    ok: true,
    cleaned,
    dropped,
    counts: {
      incomeSources: cleaned.income.sources.length,
      expenses: cleaned.expenses.length,
      debts: cleaned.debts.length,
      goals: cleaned.goals.length,
      logs: cleaned.logs.length,
    },
    warnings: [
      ...(raw.app && raw.app !== '$honchoy' ? [`Replaced app "${raw.app}" with "$honchoy".`] : []),
      ...(dropped.expenses > 0 ? [`Dropped ${dropped.expenses} expense row(s) with no amount.`] : []),
      ...(dropped.debts > 0 ? [`Dropped ${dropped.debts} debt row(s) with no amount.`] : []),
    ],
  })
})

/**
 * Onboarding flow (18+ confirmation → income setup → summary).
 * Standalone vanilla-JS module in `public/static/onboarding/` — see its README
 * section. Served as its own page so it does not interfere with the dashboard shell.
 */
app.get('/onboarding', (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#e24d82">
  <title>$honchoy — Get started</title>
  <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css" rel="stylesheet">
  <link href="/static/onboarding/style.css" rel="stylesheet">
</head>
<body>
  <div id="app" class="app"></div>
  <noscript>$honchoy needs JavaScript to run.</noscript>
  <script type="module" src="/static/onboarding/js/app.js"></script>
</body>
</html>`),
)

app.get('/', (c) => c.render(<Shell />))

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ ok: false, error: `No such endpoint: ${c.req.path}` }, 404)
  }
  return c.render(<Shell />)
})

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : 'Unexpected error'
  if (c.req.path.startsWith('/api/')) {
    return c.json({ ok: false, error: message }, 500)
  }
  return c.text(`$honchoy hit an error: ${message}`, 500)
})

export default app
