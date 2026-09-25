/**
 * Render check — executes the *built* browser bundle against a minimal DOM shim.
 *
 * Why this exists: the engine tests prove the maths, but nothing proved that the
 * view layer actually renders. This boots `dist/static/app.js` exactly as a
 * browser would, then walks every route and asserts the output is well formed.
 *
 * It catches the class of bug a syntax check cannot: a renamed variable leaking
 * `undefined` into a template string, a broken route, a crashed boot.
 *
 * Run with `npm run test:render` (needs `npm run build:client` first).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/* ── Minimal DOM ───────────────────────────────────────────────────────── */

const ids = new Map()
function makeEl(id, extra = {}) {
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    open: false,
    files: null,
    dataset: {},
    style: {},
    options: { length: 0 },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    remove() {},
    click() {},
    focus() {},
    scrollIntoView() {},
    reset() {},
    showModal() {
      this.open = true
    },
    close() {
      this.open = false
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    elements: { namedItem: () => null },
    ...extra,
  }
  ids.set(id, el)
  return el
}

const els = {
  app: makeEl('app'),
  nav: makeEl('nav'),
  currency: makeEl('currency-select'),
  banner: makeEl('storage-banner', { hidden: true }),
  toast: makeEl('toast', { hidden: true }),
  modal: makeEl('modal'),
  modalTitle: makeEl('modal-title'),
  modalBody: makeEl('modal-body'),
  modalClose: makeEl('modal-close'),
}

const document_ = {
  querySelector(sel) {
    if (typeof sel !== 'string' || !sel.startsWith('#')) return null
    return ids.get(sel.slice(1)) ?? null
  },
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => makeEl('created'),
  body: { appendChild() {}, append() {} },
}

const store = new Map()
const localStorage_ = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const listeners = {}
const location_ = { hash: '#/dashboard', search: '', pathname: '/', origin: 'http://localhost:3000' }

const window_ = {
  addEventListener: (type, fn) => {
    listeners[type] = fn
  },
  removeEventListener() {},
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t),
  scrollTo() {},
  location: location_,
  confirm: () => false,
  localStorage: localStorage_,
}

globalThis.document = document_
globalThis.window = window_
globalThis.localStorage = localStorage_
globalThis.location = location_
globalThis.history = { replaceState() {} }
globalThis.confirm = () => false
// `navigator` is a getter-only built-in on globalThis in Node 22, so define it.
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
  writable: true,
})

/* ── Boot the real bundle ──────────────────────────────────────────────── */

const bundlePath = resolve('dist/static/app.js')
if (!existsSync(bundlePath)) {
  console.error(`\nMissing ${bundlePath} — run \`npm run build:client\` first.\n`)
  process.exit(1)
}

console.log('Render check — executing the built bundle\n')

let bootError = null
try {
  await import(`${bundlePath}?t=${Date.now()}`)
} catch (err) {
  bootError = err
}

console.log('Boot')
check('bundle executes without throwing', bootError === null, bootError?.message ?? '')
check('navigation was rendered', els.nav.innerHTML.length > 0)
check('currency picker was populated', els.currency.innerHTML.includes('USD'))
check('dashboard rendered into #app', els.app.innerHTML.length > 500)

if (bootError) {
  console.error(`\nCannot continue: the bundle failed to boot.\n${bootError.stack}`)
  console.log(`\nFAIL — ${passed} passed, ${failed} failed\n`)
  process.exit(1)
}

/* ── Every route must render cleanly ───────────────────────────────────── */

const ROUTES = ['dashboard', 'expenses', 'debts', 'budget', 'goals', 'log', 'data']
const EXPECTED = {
  dashboard: ['Your month at a glance', 'Monthly income', 'Debt payoff order'],
  expenses: ['Fixed vs variable', 'All expenses', 'By category'],
  debts: ['Debt overview', 'Debt-to-income check', 'Payoff plan', 'Your debts'],
  budget: ['Automatic budget plan', 'Emergency fund', 'Remainder to allocate'],
  goals: ['Saving queue', 'Goals tracked'],
  log: ['Spending log', 'Entries', 'Pace'],
  data: ['Data &amp; settings', 'Your data shape'],
}

console.log('\nRoutes')
for (const route of ROUTES) {
  location_.hash = `#/${route}`
  els.app.innerHTML = ''
  try {
    listeners.hashchange?.()
  } catch (err) {
    check(`${route} renders`, false, err.message)
    continue
  }
  const html = els.app.innerHTML
  const ok = html.length > 400
  check(`${route} renders (${html.length} chars)`, ok, html.slice(0, 120))
  for (const needle of EXPECTED[route]) {
    check(`${route} contains "${needle}"`, html.includes(needle))
  }
}

/* ── Template hygiene ──────────────────────────────────────────────────── */

console.log('\nTemplate hygiene')
for (const route of ROUTES) {
  location_.hash = `#/${route}`
  els.app.innerHTML = ''
  listeners.hashchange?.()
  const html = els.app.innerHTML
  check(`${route} has no "undefined"`, !/\bundefined\b/.test(html), (html.match(/.{0,60}undefined.{0,60}/) ?? [''])[0])
  check(`${route} has no "NaN"`, !/\bNaN\b/.test(html), (html.match(/.{0,60}NaN.{0,60}/) ?? [''])[0])
  check(`${route} has no "[object"`, !html.includes('[object'), (html.match(/.{0,60}\[object.{0,60}/) ?? [''])[0])
}

console.log('\nUnbalanced markup')
for (const route of ROUTES) {
  location_.hash = `#/${route}`
  els.app.innerHTML = ''
  listeners.hashchange?.()
  const html = els.app.innerHTML
  const open = (html.match(/<div\b/g) ?? []).length
  const close = (html.match(/<\/div>/g) ?? []).length
  check(`${route} <div> tags balance (${open}/${close})`, open === close)
}

/* ── The numbers actually reach the DOM ────────────────────────────────── */

console.log('\nData reaches the DOM')
location_.hash = '#/dashboard'
els.app.innerHTML = ''
listeners.hashchange?.()
const dash = els.app.innerHTML
check('shows the monthly income total', dash.includes('20,000'), dash.slice(0, 200))
check('shows the expense total', dash.includes('11,500'))
check('shows the remainder', dash.includes('7,050'))
check('shows the affected-plan flag', /interest rate/i.test(dash))
check('shows a health score', /dial__score/.test(dash))

// The sample's 34% credit purchase must surface its warning somewhere.
location_.hash = '#/debts'
els.app.innerHTML = ''
listeners.hashchange?.()
const debtsHtml = els.app.innerHTML
check('flags the 34% rate on the debts tab', /34%/.test(debtsHtml))
check('lists every debt', ['MFI', 'Bank salary', 'Shop credit'].every((n) => debtsHtml.includes(n)))

/* ── Summary ───────────────────────────────────────────────────────────── */

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
