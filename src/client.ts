/**
 * $honchoy — browser application.
 *
 * This file is bundled by esbuild into `/static/app.js` (see `npm run build:client`).
 * It imports `computeFinancials` from the engine, so the number the user sees in
 * the browser is produced by exactly the same code the Worker runs.
 *
 * Architecture: a tiny state + string-template renderer. Every view is a pure
 * function of `(data, options, analysis)`. After any mutation we save, recompute
 * and re-render. Event handling is delegated from `#app`, which survives
 * `innerHTML` swaps.
 */

import {
  computeFinancials,
  DEFAULT_OPTIONS,
  debtLabel,
  emptyData,
  fmtMoney,
  normalizeData,
  round2,
} from './engine'
import type { EngineOptions } from './engine'
import { CATEGORIES, DEBT_TYPE_LABELS, SAMPLE_DATA } from './sample'
import type {
  Analysis,
  Debt,
  DebtType,
  Expense,
  Goal,
  HonchoyData,
  IncomeType,
  LogEntry,
  Severity,
} from './types'

/* ═══════════════════════ 1. Constants & state ═══════════════════════ */

const KEY_DATA = 'honchoy.v1.data'
const KEY_OPTIONS = 'honchoy.v1.options'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MNT', 'INR', 'KES', 'NGN', 'PHP', 'VND', 'IDR', 'BRL', 'JPY']

const ROUTES = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'expenses', label: 'Expenses', icon: '▤' },
  { id: 'debts', label: 'Debts', icon: '⛓' },
  { id: 'budget', label: 'Budget', icon: '◫' },
  { id: 'goals', label: 'Goals', icon: '★' },
  { id: 'log', label: 'Spending log', icon: '✎' },
  { id: 'data', label: 'Data', icon: '⇅' },
] as const

type RouteId = (typeof ROUTES)[number]['id']

interface State {
  data: HonchoyData
  options: EngineOptions
  route: RouteId
  analysis: Analysis
  storageOk: boolean
}

const state: Partial<State> = {}
let storageOk = true

/* ═══════════════════════ 2. Tiny helpers ═══════════════════════════ */

/** Escape text for HTML and attribute contexts. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T | null

/** Unique id for a new row. */
function uid(prefix = 'x'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}${rnd}`
}

/** Today as `YYYY-MM-DD` (local time — what the user means by "today"). */
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Money in the snapshot's currency. */
function money(n: number): string {
  return fmtMoney(n, state.data?.user.currency || 'USD')
}

/** Compact money for tight cells (20.0k / 1.2m). */
function moneyShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${round2(abs / 1_000_000)}m`
  if (abs >= 10_000) return `${sign}${round2(abs / 1000)}k`
  return money(n)
}

function pctOf(v: number, digits = 0): string {
  return `${(Number.isFinite(v) ? v * 100 : 0).toFixed(digits)}%`
}

/** `YYYY-MM` -> `Sep 2027`. */
function monthLabel(ym: string | null): string {
  if (!ym) return '—'
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Months -> "2 yr 3 mo" for humans. */
function durationLabel(months: number | null): string {
  if (months === null) return 'never'
  if (months === 0) return 'done'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}

/** A field label with an input, wired to a form's `name`. */
function field(
  label: string,
  name: string,
  opts: { type?: string; value?: string | number; step?: string; min?: string; placeholder?: string; required?: boolean; hint?: string; id?: string } = {},
): string {
  const id = opts.id ?? `f-${name}-${Math.random().toString(36).slice(2, 7)}`
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <input class="input${opts.type === 'number' ? ' input--amount' : ''}" id="${id}" name="${esc(name)}"
      type="${opts.type ?? 'text'}"
      ${opts.value !== undefined ? `value="${esc(opts.value)}"` : ''}
      ${opts.step ? `step="${opts.step}"` : ''}
      ${opts.min ? `min="${opts.min}"` : ''}
      ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}
      ${opts.required ? 'required' : ''}>
    ${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}
  </div>`
}

/** A `<select>` field. */
function selectField(
  label: string,
  name: string,
  options: { value: string; label: string }[],
  current?: string,
  hint?: string,
): string {
  const id = `f-${name}-${Math.random().toString(36).slice(2, 7)}`
  return `<div class="field">
    <label for="${id}">${esc(label)}</label>
    <select class="select" id="${id}" name="${esc(name)}">
      ${options
        .map(
          (o) =>
            `<option value="${esc(o.value)}"${o.value === current ? ' selected' : ''}>${esc(o.label)}</option>`,
        )
        .join('')}
    </select>
    ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
  </div>`
}

/* ── Feedback ── */

let toastTimer: number | undefined
function toast(message: string): void {
  const el = $('#toast')
  if (!el) return
  el.textContent = message
  el.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    el.hidden = true
  }, 2600)
}

function openModal(title: string, body: string): void {
  const dialog = $('#modal') as HTMLDialogElement | null
  if (!dialog) return
  $('#modal-title')!.textContent = title
  $('#modal-body')!.innerHTML = body
  if (!dialog.open) dialog.showModal()
}

function closeModal(): void {
  const dialog = $('#modal') as HTMLDialogElement | null
  if (dialog?.open) dialog.close()
}

function download(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/* ═══════════════════════ 3. Persistence ═══════════════════════════ */

function load(): { data: HonchoyData; options: EngineOptions } {
  // Always start from a *copy* of the sample: `ensureIds` rewrites the arrays,
  // and mutating the shared SAMPLE_DATA constant would leak between loads.
  let data = JSON.parse(JSON.stringify(SAMPLE_DATA)) as HonchoyData
  let options = { ...DEFAULT_OPTIONS }

  // A `?d=<json>` link wins: that is how "share this plan" works.
  const shared = new URLSearchParams(location.search).get('d')
  if (shared) {
    try {
      data = normalizeData(JSON.parse(decodeURIComponent(shared)))
      history.replaceState(null, '', location.pathname + location.hash)
      toast('Loaded the shared plan.')
    } catch {
      toast('That share link could not be read — using your saved data.')
    }
  } else {
    try {
      const raw = localStorage.getItem(KEY_DATA)
      if (raw) data = normalizeData(JSON.parse(raw))
      const rawOpts = localStorage.getItem(KEY_OPTIONS)
      if (rawOpts) options = { ...options, ...JSON.parse(rawOpts) }
    } catch {
      storageOk = false
    }
  }
  return { data: ensureIds(data), options }
}

function save(): void {
  if (!storageOk || !state.data) return
  try {
    localStorage.setItem(KEY_DATA, JSON.stringify(state.data))
    localStorage.setItem(KEY_OPTIONS, JSON.stringify(state.options))
  } catch {
    storageOk = false
    const banner = $('#storage-banner')
    if (banner) banner.hidden = false
  }
}

/** Give every expense/debt a stable id so edits and deletes are index-free. */
function ensureIds(data: HonchoyData): HonchoyData {
  data.expenses = data.expenses.map((e, i) => ({ ...e, id: e.id || `e${i + 1}-${uid('')}` }))
  data.debts = data.debts.map((d, i) => ({ ...d, id: d.id || `d${i + 1}-${uid('')}` }))
  data.goals = data.goals.map((g, i) => ({ ...g, id: g.id || `g${i + 1}-${uid('')}` }))
  return data
}

/** Recompute + re-render. Called after every mutation. */
function refresh(): void {
  state.analysis = computeFinancials({ data: state.data, options: state.options })
  save()
  render()
}

const analysis = () => state.analysis!

/* ═══════════════════════ 4. Shared view pieces ═══════════════════════════ */

function stat(label: string, value: string, meta?: string, tone?: 'pink' | 'good' | 'danger'): string {
  return `<article class="stat">
    <span class="stat__label">${esc(label)}</span>
    <span class="stat__value${tone ? ` stat__value--${tone}` : ''}">${esc(value)}</span>
    ${meta ? `<span class="stat__meta">${meta}</span>` : ''}
  </article>`
}

function barRow(label: string, value: number, max: number, tone = 'pink', valueText?: string): string {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return `<div class="bar-row">
    <span class="bar-row__label" title="${esc(label)}">${esc(label)}</span>
    <span class="bar"><span class="bar__fill bar__fill--${tone}" style="width:${width.toFixed(1)}%"></span></span>
    <span class="bar-row__value">${esc(valueText ?? money(value))}</span>
  </div>`
}

const SEV_ICON: Record<Severity, string> = { high: '!', warn: '!', info: 'i', good: '✓' }

function flagList(flags: Analysis['flags']): string {
  if (flags.length === 0) return `<p class="muted small">No warnings — nothing stands out.</p>`
  const order: Severity[] = ['high', 'warn', 'info', 'good']
  const sorted = [...flags].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
  return `<ul class="flags">
    ${sorted
      .map(
        (f) => `<li class="flag flag--${f.severity}">
          <span class="flag__icon" aria-hidden="true">${SEV_ICON[f.severity]}</span>
          <div>
            <div class="flag__title">${esc(f.title)}</div>
            <div class="flag__text">${esc(f.message)}</div>
          </div>
        </li>`,
      )
      .join('')}
  </ul>`
}

function emptyState(title: string, text: string, action?: string): string {
  return `<div class="empty">
    <div class="empty__title">${esc(title)}</div>
    <p class="small">${esc(text)}</p>
    ${action ?? ''}
  </div>`
}

/* ═══════════════════════ 5. Dashboard ═══════════════════════════ */

const BAND_LABEL: Record<Analysis['health']['band'], string> = {
  strong: 'Strong',
  okay: 'Okay',
  stretched: 'Stretched',
  at_risk: 'At risk',
}

function viewDashboard(): string {
  const a = analysis()
  const b = a.budget
  const d = a.debts
  const ringColor =
    a.health.score >= 80 ? 'var(--good)' : a.health.score >= 60 ? 'var(--pink-500)' : a.health.score >= 40 ? 'var(--warn)' : 'var(--danger)'

  return `
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Your month at a glance</h1>
        <p class="card__hint">
          Everything below is calculated from your income, expenses and debt. Change anything on the
          other tabs and these numbers update immediately.
        </p>
      </div>
      <span class="badge badge--${a.health.score >= 80 ? 'good' : a.health.score >= 60 ? 'muted' : a.health.score >= 40 ? 'warn' : 'danger'}">
        ${BAND_LABEL[a.health.band]}
      </span>
    </div>

    <div class="dial">
      <div class="dial__ring" style="--pct:${a.health.score};--ring:${ringColor}" role="img"
           aria-label="Financial health score ${a.health.score} out of 100">
        <div class="dial__inner">
          <span class="dial__score">${a.health.score}</span>
          <span class="dial__caption">health</span>
        </div>
      </div>
      <div style="flex:1;min-width:220px">
        <div class="grid grid--2">
          ${stat('Monthly income', money(a.income.monthly), `${esc(String(a.income.type))} basis`)}
          ${stat('Living expenses', money(a.expenses.total), `${pctOf(a.expenses.incomeShare)} of income`)}
          ${stat('Disposable income', money(b.disposableIncome), 'income − expenses', b.disposableIncome < 0 ? 'danger' : undefined)}
          ${stat('Debt carve-out', money(b.debtCarveOut), `${pctOf(d.dti)} of income (DTI)`, d.dti > DEFAULT_OPTIONS.dtiMax ? 'danger' : undefined)}
        </div>
      </div>
    </div>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Left to allocate', money(b.remainder), `${pctOf(b.remainderShare)} of income`)}
    ${stat(
      'Emergency fund',
      `${Math.round(b.emergencyFund.fundedRatio * 100)}%`,
      b.emergencyFund.fullyFunded
        ? `funded · ${b.emergencyFund.monthsCovered} mo cover`
        : `${money(b.emergencyFund.gap)} to go`,
    )}
    ${stat(
      'Debt-free',
      d.count === 0 ? '—' : monthLabel(d.plan.debtFreeMonth),
      d.count === 0
        ? 'no debts recorded'
        : d.plan.months === null
          ? 'payment too small to clear'
          : `${durationLabel(d.plan.months)} away`,
    )}
    ${stat(
      'Flexible allowance',
      money(b.flexibleAllocation),
      `${money(round2(b.flexibleAllocation / 30))} a day`,
    )}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>What needs attention</h2></div></div>
        ${flagList(a.flags)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>What to do next</h2></div>
        </div>
        ${
          a.recommendations.length === 0
            ? `<p class="muted small">Nothing to act on. Add income, expenses and debt to get a full plan.</p>`
            : `<ol class="recos">${a.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`
        }
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Debt payoff order</h2></div>
          <span class="badge">${d.plan.strategy === 'avalanche' ? 'Highest rate first' : 'Smallest balance first'}</span>
        </div>
        ${
          d.count === 0
            ? emptyState('No debts recorded', 'Add your loans and credit purchases on the Debts tab.')
            : `<p class="small muted">
            Simulating ${money(d.plan.monthlyPool)} a month across your ${d.count} debt${d.count === 1 ? '' : 's'}:
            <strong>${d.plan.months === null ? 'the balance never clears' : `${durationLabel(d.plan.months)} to go`}</strong>,
            ${money(d.plan.totalInterest)} total interest
            ${d.plan.debtFreeMonth ? `· debt-free ${monthLabel(d.plan.debtFreeMonth)}` : ''}.
          </p>
          <ol class="timeline">
            ${d.plan.payoffOrder
              .map(
                (p, i) => `<li>
                  <span class="timeline__idx">${i + 1}</span>
                  <div class="timeline__body">
                    <div class="timeline__title">${esc(p.name)}</div>
                    <div class="timeline__meta">cleared in month ${p.month} · ${monthLabel(
                      d.plan.debtFreeMonth ? addMonthsFrom(d.plan.debtFreeMonth, -(d.plan.months! - p.month)) : null,
                    )}</div>
                  </div>
                </li>`,
              )
              .join('')}
          </ol>`
        }
      </section>
    </div>

    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>Where the money goes</h2></div></div>
        ${allocationSplit(b)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Spending pace</h2></div>
          <span class="badge badge--${a.spending.onTrack ? 'good' : 'warn'}">
            ${a.spending.onTrack ? 'On plan' : 'Over plan'}
          </span>
        </div>
        ${spendingPace(a)}
      </section>

      ${d.count > 0 ? topDebtCard(a) : ''}
    </div>
  </div>`
}

/** Format "months before the debt-free month", used for the payoff timeline. */
function addMonthsFrom(ym: string | null, months: number): string | null {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** The allocation split bar + legend (emergency / goals / flexible). */
function allocationSplit(b: Analysis['budget']): string {
  const total = b.remainder
  const seg = (amount: number, cls: string, label: string) => {
    const share = total > 0 ? (amount / total) * 100 : 0
    return share > 0
      ? `<span class="split__seg split__seg--${cls}" style="width:${share.toFixed(2)}%"
               title="${esc(label)}: ${esc(money(amount))}"></span>`
      : ''
  }
  return `
    <div class="split" role="img" aria-label="How the ${money(total)} remainder is split">
      ${seg(b.emergencyAllocation, 'deep', 'Emergency fund')}
      ${seg(b.goalsAllocation, 'info', 'Goals')}
      ${seg(b.flexibleAllocation, 'pink', 'Flexible spending')}
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Emergency <strong>${esc(money(b.emergencyAllocation))}</strong> <span class="muted">(${pctOf(b.allocations[0].weight)})</span></li>
      <li><span class="legend__dot" style="background:#9b8cf0"></span> Goals <strong>${esc(money(b.goalsAllocation))}</strong> <span class="muted">(${pctOf(b.allocations[1].weight)})</span></li>
      <li><span class="legend__dot" style="background:var(--pink-400)"></span> Flexible <strong>${esc(money(b.flexibleAllocation))}</strong> <span class="muted">(${pctOf(b.allocations[2].weight)})</span></li>
    </ul>
    <p class="small muted" style="margin-top:var(--space-3)">
      The emergency fund takes the largest share until it is fully funded, then drops to a
      maintenance top-up and the freed money moves to goals and spending.
    </p>`
}

function spendingPace(a: Analysis): string {
  const s = a.spending
  if (s.entries === 0) {
    return `<p class="small muted">
      No spending logged yet. Add entries on the <a href="#/log">Spending log</a> tab and $honchoy
      will project where the month is heading.
    </p>`
  }
  const used = s.allowance > 0 ? Math.min(100, (s.projectedMonthTotal / s.allowance) * 100) : 0
  return `
    ${barRow(
      'Projected this month',
      s.projectedMonthTotal,
      Math.max(s.allowance, s.projectedMonthTotal, 1),
      s.onTrack ? 'good' : 'danger',
      money(s.projectedMonthTotal),
    )}
    <div class="bar-row">
      <span class="bar-row__label">Allowance used</span>
      <span class="bar"><span class="bar__fill bar__fill--${s.onTrack ? 'good' : 'danger'}" style="width:${used.toFixed(1)}%"></span></span>
      <span class="bar-row__value">${pctOf(s.allowance > 0 ? s.projectedMonthTotal / s.allowance : 0)}</span>
    </div>
    <dl class="kv" style="margin-top:var(--space-4)">
      <dt>Logged this month</dt><dd>${esc(money(s.currentMonthTotal))}</dd>
      <dt>Daily average</dt><dd>${esc(money(s.dailyAverage))}</dd>
      <dt>Flexible allowance</dt><dd>${esc(money(s.allowance))}</dd>
      <dt>${s.overUnder >= 0 ? 'Over plan by' : 'Under plan by'}</dt>
      <dd style="color:${s.overUnder >= 0 ? 'var(--danger)' : 'var(--good)'}">${esc(money(Math.abs(s.overUnder)))}</dd>
    </dl>`
}

function topDebtCard(a: Analysis): string {
  const worst = a.debts.items.find((i) => i.severity) ?? a.debts.items[0]
  if (!worst) return ''
  return `<section class="card">
    <div class="card__head">
      <div class="card__title"><h2>Most expensive debt</h2></div>
      ${worst.severity ? `<span class="badge badge--${worst.severity === 'high' ? 'danger' : 'warn'}">${worst.interestRate}% APR</span>` : ''}
    </div>
    <p style="font-weight:650;margin-bottom:2px">${esc(worst.name)}</p>
    <p class="small muted">${esc(debtLabel(worst.type))} · ${esc(money(worst.amount))} owed</p>
    <dl class="kv" style="margin-top:var(--space-3)">
      <dt>Interest this month</dt><dd>${esc(money(worst.monthlyInterest))}</dd>
      <dt>Minimum payment</dt><dd>${esc(money(worst.minMonthlyPayment))}</dd>
      <dt>Cleared by</dt><dd>${esc(monthLabel(worst.payoff.payoffMonth))}</dd>
    </dl>
    ${worst.note ? `<p class="debt__note">${esc(worst.note)}</p>` : ''}
  </section>`
}

/* ═══════════════════════ 6. Expenses ═══════════════════════════ */

function viewExpenses(): string {
  const a = analysis()
  const e = a.expenses
  const rows = [...state.data!.expenses].sort((x, y) => y.amount - x.amount)
  const maxCat = e.byCategory[0]?.amount ?? 0
  const maxExpense = rows[0]?.amount ?? 0

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Expenses</h1>
        <p class="card__hint">
          Tag each cost as <strong>fixed</strong> (committed every month) or <strong>variable</strong>
          (moves around). The split tells you how much room you actually have to cut.
        </p>
      </div>
    </div>

    <form class="form-grid" id="expense-form" data-mode="create" data-id="" autocomplete="off">
      ${field('What is it?', 'name', { placeholder: 'House rent', required: true })}
      ${selectField('Category', 'category', CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })), 'rent')}
      ${field('Amount', 'amount', { type: 'number', step: '0.01', min: '0', placeholder: '6000', required: true, hint: 'per month' })}
      ${selectField('Type', 'type', [
        { value: 'fixed', label: 'Fixed — same every month' },
        { value: 'variable', label: 'Variable — moves month to month' },
      ], 'fixed')}
      <div class="row span-all">
        <button class="btn" type="submit" id="expense-submit">Add expense</button>
        <button class="btn btn--subtle" type="button" data-action="expense-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Total monthly', money(e.total), `${e.count} item${e.count === 1 ? '' : 's'}`)}
    ${stat('Fixed', money(e.fixed), `${pctOf(e.fixedShare)} of spending`)}
    ${stat('Variable', money(e.variable), `${pctOf(e.variableShare)} of spending`)}
    ${stat('Share of income', pctOf(e.incomeShare), 'expenses ÷ income', e.incomeShare > 0.8 ? 'danger' : undefined)}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Fixed vs variable</h2></div>
      <span class="badge badge--${e.variableShare >= 0.3 ? 'good' : 'warn'}">
        ${e.variableShare >= 0.3 ? 'You have room to adjust' : 'Little room to adjust'}
      </span>
    </div>
    <div class="split" role="img" aria-label="Fixed ${pctOf(e.fixedShare)} versus variable ${pctOf(e.variableShare)}">
      <span class="split__seg split__seg--deep" style="width:${(e.fixedShare * 100).toFixed(1)}%"></span>
      <span class="split__seg split__seg--muted" style="width:${(e.variableShare * 100).toFixed(1)}%"></span>
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Fixed <strong>${esc(money(e.fixed))}</strong></li>
      <li><span class="legend__dot" style="background:var(--pink-200)"></span> Variable <strong>${esc(money(e.variable))}</strong></li>
    </ul>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>All expenses</h2></div>
        <span class="muted small">${rows.length} item${rows.length === 1 ? '' : 's'}</span>
      </div>
      ${
        rows.length === 0
          ? emptyState('Nothing added yet', 'Add your first expense above — rent is usually the biggest fixed cost.')
          : `<ul class="items">
        ${rows
          .map(
            (x) => `<li>
            <div class="items__main">
              <span class="cell-title">${esc(x.name)}</span>
              <span class="cell-sub">
                ${esc(x.category)} ·
                <span class="badge badge--${x.type === 'fixed' ? 'muted' : 'good'}">${esc(x.type)}</span>
              </span>
            </div>
            <div class="items__side">
              <strong class="tabnum">${esc(money(x.amount))}</strong>
              <button class="icon-action" data-action="expense-edit" data-id="${esc(x.id)}">Edit</button>
              <button class="icon-action icon-action--danger" data-action="expense-delete" data-id="${esc(x.id)}">Delete</button>
            </div>
          </li>`,
          )
          .join('')}
      </ul>`
      }
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>By category</h2></div></div>
      ${
        e.byCategory.length === 0
          ? `<p class="muted small">No categories yet.</p>`
          : e.byCategory
              .map((c) =>
                barRow(`${c.category} (${c.count})`, c.amount, maxCat, c.type === 'fixed' ? 'deep' : 'pink', money(c.amount)),
              )
              .join('')
      }
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Biggest line items</h2></div></div>
    ${
      rows.length === 0
        ? `<p class="muted small">Add expenses to see the ranking.</p>`
        : rows.slice(0, 5).map((x) => barRow(x.name, x.amount, maxExpense, 'deep', money(x.amount))).join('')
    }
  </section>`
}

/* ═══════════════════════ 7. Debts ═══════════════════════════ */

function dtiTone(dti: number): 'good' | 'warn' | 'danger' {
  if (dti > state.options!.dtiMax) return 'danger'
  if (dti > state.options!.dtiWatch) return 'warn'
  return 'good'
}

function viewDebts(): string {
  const a = analysis()
  const d = a.debts
  const opts = state.options!
  const wide = Math.max(0.6, d.dti * 1.15, opts.dtiMax * 1.2)

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Debt overview</h1>
        <p class="card__hint">
          Add every loan you carry — bank, microfinance, informal/family and shop credit. $honchoy
          checks how much of your income goes to debt, whether any rate is unusually expensive, and
          how long each balance takes to clear.
        </p>
      </div>
    </div>

    <form class="form-grid" id="debt-form" data-mode="create" data-id="" autocomplete="off">
      ${selectField('Type', 'type', Object.entries(DEBT_TYPE_LABELS).map(([value, label]) => ({ value, label })), 'microloan')}
      ${field('Label (optional)', 'name', { placeholder: 'MFI working-capital loan' })}
      ${field('Amount owed', 'amount', { type: 'number', step: '0.01', min: '0', placeholder: '5000', required: true })}
      ${field('Interest rate', 'interestRate', { type: 'number', step: '0.1', min: '0', placeholder: '20', hint: '% per year', required: true })}
      ${field('Minimum monthly payment', 'minMonthlyPayment', { type: 'number', step: '0.01', min: '0', placeholder: '500', required: true })}
      <div class="row span-all">
        <button class="btn" type="submit" id="debt-submit">Add debt</button>
        <button class="btn btn--subtle" type="button" data-action="debt-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Total owed', money(d.totalOwed), `${d.count} debt${d.count === 1 ? '' : 's'}`, 'pink')}
    ${stat('Minimums / month', money(d.totalMinMonthlyPayment), `${pctOf(d.dti)} of income`)}
    ${stat('Weighted avg rate', `${d.weightedAverageRate}%`, `highest ${d.highestRate}%`)}
    ${stat('Interest / month', money(d.monthlyInterestCost), `${money(round2(d.monthlyInterestCost * 12))} a year`, 'danger')}
  </div>

  <div class="grid grid--2" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Debt-to-income check</h2></div>
        <span class="badge badge--${dtiTone(d.dti)}">${pctOf(d.dti)} of income</span>
      </div>
      <div class="bar-row">
        <span class="bar-row__label">Debt payments</span>
        <span class="bar">
          <span class="bar__fill bar__fill--${dtiTone(d.dti)}" style="width:${Math.min(100, (d.dti / wide) * 100).toFixed(1)}%"></span>
        </span>
        <span class="bar-row__value">${pctOf(d.dti)}</span>
      </div>
      <ul class="legend">
        <li><span class="legend__dot" style="background:var(--good)"></span> under ${pctOf(opts.dtiWatch)} — comfortable</li>
        <li><span class="legend__dot" style="background:var(--warn)"></span> ${pctOf(opts.dtiWatch)}–${pctOf(opts.dtiMax)} — watch</li>
        <li><span class="legend__dot" style="background:var(--danger)"></span> over ${pctOf(opts.dtiMax)} — over-indebted</li>
      </ul>
      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Monthly income</dt><dd>${esc(money(a.income.monthly))}</dd>
        <dt>Debt payments</dt><dd>${esc(money(d.totalMinMonthlyPayment))}</dd>
        <dt>Money left after living costs</dt><dd>${esc(money(a.budget.disposableIncome))}</dd>
        <dt>Headroom for debt</dt>
        <dd style="color:${a.budget.disposableIncome - d.totalMinMonthlyPayment >= 0 ? 'var(--good)' : 'var(--danger)'}">
          ${esc(money(round2(a.budget.disposableIncome - d.totalMinMonthlyPayment)))}
        </dd>
      </dl>
    </section>

    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Payoff plan</h2></div>
        <div class="seg" role="group" aria-label="Payoff strategy">
          <button type="button" data-action="strategy" data-value="avalanche" aria-pressed="${opts.strategy === 'avalanche'}">Highest rate</button>
          <button type="button" data-action="strategy" data-value="snowball" aria-pressed="${opts.strategy === 'snowball'}">Smallest balance</button>
        </div>
      </div>

      <div class="field">
        <label for="extra-payment">Extra payment on top of minimums</label>
        <input class="range" type="range" id="extra-payment" min="0" max="${Math.max(2000, Math.round(d.totalMinMonthlyPayment * 2))}" step="50"
               value="${opts.extraDebtPayment}" data-action="extra-payment">
        <div class="row row--between">
          <span class="hint">Total to debt: <strong id="extra-total">${esc(money(d.plan.monthlyPool))}</strong> / month</span>
          <strong id="extra-value">${esc(money(opts.extraDebtPayment))} extra</strong>
        </div>
      </div>

      <hr class="divider">

      ${
        d.count === 0
          ? `<p class="muted small">Add a debt to see a payoff timeline.</p>`
          : d.plan.underfunded
            ? `<p class="debt__note">Your monthly pool of ${esc(money(d.plan.monthlyPool))} is below the ${esc(money(d.totalMinMonthlyPayment))} in minimum payments, so the balances cannot be cleared. Increase the amount or renegotiate the payments.</p>`
            : `<dl class="kv">
            <dt>Monthly pool</dt><dd>${esc(money(d.plan.monthlyPool))}</dd>
            <dt>Time to clear everything</dt><dd>${esc(durationLabel(d.plan.months))}</dd>
            <dt>Debt-free</dt><dd>${esc(monthLabel(d.plan.debtFreeMonth))}</dd>
            <dt>Total interest</dt><dd>${esc(money(d.plan.totalInterest))}</dd>
            <dt>Total paid</dt><dd>${esc(money(d.plan.totalPaid))}</dd>
          </dl>
          <p class="small muted" style="margin-top:var(--space-3)">
            ${
              d.plan.alternate.months === null
                ? `The other strategy never clears under this payment.`
                : `Choosing ${d.plan.alternate.strategy === 'avalanche' ? 'highest rate' : 'smallest balance'} first instead would take
                   ${esc(durationLabel(d.plan.alternate.months))} and cost ${esc(money(d.plan.alternate.totalInterest))} in interest
                   (${d.plan.alternate.totalInterest <= d.plan.totalInterest ? 'cheaper' : `${esc(money(round2(d.plan.alternate.totalInterest - d.plan.totalInterest)))} more`}).`
            }
          </p>`
      }
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Warnings</h2></div>
    </div>
    ${flagList(a.flags.filter((f) => f.code.startsWith('dti_') || f.code.startsWith('interest_') || f.code === 'negative_amortization' || f.code === 'debt_shortfall'))}
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Your debts</h2></div>
      ${d.hasNegativeAmortization ? `<span class="badge badge--danger">A minimum payment is not covering interest</span>` : ''}
    </div>
    ${
      d.items.length === 0
        ? emptyState('No debts recorded', 'Add a loan above — even an informal family loan should be listed so the plan is realistic.')
        : `<div class="grid grid--2">${d.items.map(debtCard).join('')}</div>`
    }
  </section>

  ${
    d.byType.length > 0
      ? `<section class="card" style="margin-top:var(--space-4)">
      <div class="card__head"><div class="card__title"><h2>By lending channel</h2></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Type</th><th class="num">Debts</th><th class="num">Owed</th><th class="num">Minimums</th><th class="num">Avg rate</th><th class="num">Share of debt</th></tr>
          </thead>
          <tbody>
            ${d.byType
              .map(
                (g) => `<tr>
                <td><span class="cell-title">${esc(debtLabel(g.type))}</span></td>
                <td class="num">${g.count}</td>
                <td class="num">${esc(money(g.amount))}</td>
                <td class="num">${esc(money(g.minMonthlyPayment))}</td>
                <td class="num">${g.averageRate}%</td>
                <td class="num">${pctOf(d.totalOwed > 0 ? g.amount / d.totalOwed : 0)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr><td>Total</td><td class="num">${d.count}</td><td class="num">${esc(money(d.totalOwed))}</td>
            <td class="num">${esc(money(d.totalMinMonthlyPayment))}</td><td class="num">${d.weightedAverageRate}%</td><td class="num">100%</td></tr>
          </tfoot>
        </table>
      </div>
    </section>`
      : ''
  }`
}

function debtCard(item: Analysis['debts']['items'][number]): string {
  const cls = item.severity === 'high' ? 'debt debt--high' : item.severity === 'warn' ? 'debt debt--warn' : 'debt'
  const payoffTone = item.payoff.months === null ? 'danger' : item.payoff.months > 60 ? 'warn' : 'good'
  return `<article class="${cls}">
    <div class="debt__top">
      <div>
        <div class="debt__name">${esc(item.name)}</div>
        <span class="cell-sub">${esc(debtLabel(item.type))}</span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${esc(money(item.amount))}</div>
        <span class="badge badge--${payoffTone === 'danger' ? 'danger' : payoffTone === 'warn' ? 'warn' : 'muted'}">${item.interestRate}% a year</span>
      </div>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Minimum</span>
        <span class="fact__value">${esc(money(item.minMonthlyPayment))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Interest / month</span>
        <span class="fact__value">${esc(money(item.monthlyInterest))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Goes to principal</span>
        <span class="fact__value">${pctOf(item.principalShare)}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Cleared by</span>
        <span class="fact__value">${esc(monthLabel(item.payoff.payoffMonth))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to clear</span>
        <span class="fact__value">${esc(durationLabel(item.payoff.months))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Total interest</span>
        <span class="fact__value">${esc(money(item.payoff.totalInterest))}</span>
      </div>
    </div>

    <div class="bar-row" style="margin-top:var(--space-3)">
      <span class="bar-row__label">Repayment progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${item.negativeAmortization ? 'danger' : 'pink'}" style="width:${(item.principalShare * 100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${pctOf(item.principalShare)}</span>
    </div>

    ${item.note ? `<p class="debt__note">${esc(item.note)}</p>` : ''}

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="debt-edit" data-id="${esc(item.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="debt-delete" data-id="${esc(item.id)}">Delete</button>
    </div>
  </article>`
}

/* ═══════════════════════ 8. Budget planner ═══════════════════════════ */

function viewBudget(): string {
  const a = analysis()
  const b = a.budget
  const opts = state.options!
  const ef = b.emergencyFund

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Automatic budget plan</h1>
        <p class="card__hint">
          Built from your income, expenses and debt. First the debt is carved out, then whatever is
          left is split between the emergency fund, your goals and flexible spending — weighted
          toward the emergency fund until it is fully funded.
        </p>
      </div>
      <span class="badge badge--${b.remainder > 0 ? 'good' : 'danger'}">
        ${b.remainder > 0 ? `${money(b.remainder)} to allocate` : 'Nothing left to allocate'}
      </span>
    </div>

    <div class="flow">
      <div class="flow__step">
        <span class="flow__label">Monthly income<span class="flow__note">${esc(incomeTypeLabel(a.income.type))}${a.income.sources.length ? ` · ${a.income.sources.length} source${a.income.sources.length === 1 ? '' : 's'}` : ''}</span></span>
        <span class="flow__value">${esc(money(b.monthlyIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">− Living expenses<span class="flow__note">fixed ${esc(money(b.totalFixedExpenses))} + variable ${esc(money(b.totalVariableExpenses))}</span></span>
        <span class="flow__value">−${esc(money(b.totalExpenses))}</span>
      </div>
      <div class="flow__step flow__step--total">
        <span class="flow__label">= Disposable income<span class="flow__note">what is left before any debt payment</span></span>
        <span class="flow__value" style="color:${b.disposableIncome < 0 ? 'var(--danger)' : 'inherit'}">${esc(money(b.disposableIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">− Debt carve-out<span class="flow__note">minimums ${esc(money(b.totalMinDebtPayments))}${opts.extraDebtPayment > 0 ? ` + extra ${esc(money(opts.extraDebtPayment))}` : ''}</span></span>
        <span class="flow__value">−${esc(money(b.debtCarveOut))}</span>
      </div>
      ${
        b.debtShortfall > 0
          ? `<div class="flow__step flow__step--minus">
              <span class="flow__label">Shortfall<span class="flow__note">your income cannot cover the debt payments — this has to be solved first</span></span>
              <span class="flow__value" style="color:var(--danger)">${esc(money(b.debtShortfall))}</span>
            </div>`
          : ''
      }
      <div class="flow__step flow__step--final">
        <span class="flow__label">Remainder to allocate<span class="flow__note">${pctOf(b.remainderShare)} of income</span></span>
        <span class="flow__value">${esc(money(b.remainder))}</span>
      </div>
    </div>

    <hr class="divider">

    <div class="grid grid--3">
      ${allocationCard('Emergency fund', b.emergencyAllocation, b.allocations[0].weight, b.allocations[0].rationale, 'deep')}
      ${allocationCard('Goals', b.goalsAllocation, b.allocations[1].weight, b.allocations[1].rationale, 'info')}
      ${allocationCard('Flexible spending', b.flexibleAllocation, b.allocations[2].weight, b.allocations[2].rationale, 'pink')}
    </div>

    <div style="margin-top:var(--space-4)">
      ${allocationSplit(b)}
    </div>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Emergency fund</h2></div>
        <span class="badge badge--${ef.fullyFunded ? 'good' : 'warn'}">
          ${ef.fullyFunded ? 'Fully funded' : `${Math.round(ef.fundedRatio * 100)}% funded`}
        </span>
      </div>

      <div class="bar-row">
        <span class="bar-row__label">Saved</span>
        <span class="bar"><span class="bar__fill bar__fill--${ef.fullyFunded ? 'good' : 'deep'}" style="width:${(ef.fundedRatio * 100).toFixed(1)}%"></span></span>
        <span class="bar-row__value">${esc(money(ef.saved))} / ${esc(money(ef.target))}</span>
      </div>

      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Target</dt><dd>${esc(money(ef.target))} <span class="muted small">(${opts.emergencyMonths} months of costs)</span></dd>
        <dt>Still needed</dt><dd>${esc(money(ef.gap))}</dd>
        <dt>Months of cover</dt><dd>${ef.monthsCovered}</dd>
        <dt>Monthly allocation</dt><dd>${esc(money(ef.monthlyAllocation))}</dd>
        <dt>Fully funded by</dt><dd>${ef.fullyFunded ? 'already done' : esc(monthLabel(ef.fundedMonth))}</dd>
      </dl>

      ${
        ef.fullyFunded
          ? `<p class="debt__note">The buffer is complete. $honchoy now sends most of the remainder to goals and spending, keeping only ${pctOf(b.allocations[0].weight)} as a top-up.</p>`
          : `<p class="debt__note">Until the buffer is full it takes ${pctOf(b.allocations[0].weight)} of the remainder — the largest share. That share shrinks automatically as the balance grows.</p>`
      }
    </section>

    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Income sources</h2></div>
      </div>
      <form class="form-grid" id="income-form" autocomplete="off">
        ${selectField('Income is stated', 'type', [
          { value: 'monthly', label: 'Per month' },
          { value: 'weekly', label: 'Per week' },
          { value: 'biweekly', label: 'Every 2 weeks' },
          { value: 'annual', label: 'Per year' },
        ], state.data!.income.type)}
        ${field('Source name', 'sourceName', { placeholder: 'salary' })}
        ${field('Amount', 'sourceAmount', { type: 'number', step: '0.01', min: '0', placeholder: '20000', hint: 'before deductions, as you receive it' })}
        <div class="row span-all">
          <button class="btn btn--sm" type="submit">Add source</button>
        </div>
      </form>

      <hr class="divider">

      ${
        a.income.sources.length === 0
          ? `<p class="muted small">No income recorded yet — the planner needs at least one source.</p>`
          : `<ul class="items">
          ${a.income.sources
            .map(
              (s, i) => `<li>
              <div class="items__main">
                <span class="cell-title">${esc(s.name)}</span>
                <span class="cell-sub">${esc(money(s.amount))} ${esc(state.data!.income.type)} · ${pctOf(s.share)} of income</span>
              </div>
              <div class="items__side">
                <strong class="tabnum">${esc(money(s.monthlyAmount))}</strong>
                <button class="icon-action icon-action--danger" data-action="income-delete" data-idx="${i}">Remove</button>
              </div>
            </li>`,
            )
            .join('')}
        </ul>
        <p class="small muted" style="margin-top:var(--space-3)">
          Monthly total: <strong>${esc(money(a.income.monthly))}</strong> · yearly <strong>${esc(money(a.income.annual))}</strong>
        </p>`
      }
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Plan settings</h2></div>
      <button class="btn btn--ghost btn--sm" type="button" data-action="options-reset">Reset to defaults</button>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="opt-extra">Extra debt payment</label>
        <input class="input input--amount" id="opt-extra" type="number" min="0" step="10" value="${opts.extraDebtPayment}" data-option="extraDebtPayment">
        <span class="hint">Added on top of the minimum payments each month.</span>
      </div>
      <div class="field">
        <label for="opt-emergency">Emergency fund target</label>
        <input class="input input--amount" id="opt-emergency" type="number" min="1" max="24" step="1" value="${opts.emergencyMonths}" data-option="emergencyMonths">
        <span class="hint">Months of living costs to keep as a buffer.</span>
      </div>
      <div class="field">
        <label for="opt-dti-watch">Debt-load warning at</label>
        <input class="input input--amount" id="opt-dti-watch" type="number" min="5" max="60" step="1" value="${Math.round(opts.dtiWatch * 100)}" data-option="dtiWatchPct">
        <span class="hint">% of income — default 30%.</span>
      </div>
      <div class="field">
        <label for="opt-dti-max">Debt-load danger at</label>
        <input class="input input--amount" id="opt-dti-max" type="number" min="10" max="80" step="1" value="${Math.round(opts.dtiMax * 100)}" data-option="dtiMaxPct">
        <span class="hint">% of income — default 40%.</span>
      </div>
      <div class="field">
        <label for="opt-rate-warn">High interest warning at</label>
        <input class="input input--amount" id="opt-rate-warn" type="number" min="5" max="200" step="1" value="${opts.highInterestWarn}" data-option="highInterestWarn">
        <span class="hint">% a year — default 25%.</span>
      </div>
      <div class="field">
        <label for="opt-rate-danger">High interest danger at</label>
        <input class="input input--amount" id="opt-rate-danger" type="number" min="5" max="300" step="1" value="${opts.highInterestDanger}" data-option="highInterestDanger">
        <span class="hint">% a year — default 40%.</span>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Why the split looks like this</h2></div></div>
    <ol class="recos">
      ${a.recommendations.map((r) => `<li>${esc(r)}</li>`).join('') || '<li>Add income, expenses and debt to generate a plan.</li>'}
    </ol>
  </section>`
}

function incomeTypeLabel(type: IncomeType): string {
  return { monthly: 'monthly', weekly: 'weekly', biweekly: 'every 2 weeks', annual: 'yearly' }[type]
}

function allocationCard(
  title: string,
  amount: number,
  weight: number,
  rationale: string,
  tone: 'deep' | 'info' | 'pink',
): string {
  const a = analysis()
  const share = a.budget.remainder > 0 ? (amount / a.budget.remainder) * 100 : 0
  return `<article class="stat">
    <span class="stat__label">${esc(title)}</span>
    <span class="stat__value stat__value--${tone === 'pink' ? 'pink' : 'good'}">${esc(money(amount))}</span>
    <div class="bar" style="margin:var(--space-3) 0 var(--space-2)">
      <span class="bar__fill bar__fill--${tone === 'deep' ? 'pink' : tone === 'info' ? 'info' : 'good'}" style="width:${share.toFixed(1)}%"></span>
    </div>
    <span class="stat__meta">${pctOf(weight)} of the remainder · ${esc(rationale)}</span>
  </article>`
}

/* ═══════════════════════ 9. Goals ═══════════════════════════ */

function viewGoals(): string {
  const a = analysis()
  const b = a.budget
  const totalTarget = state.data!.goals.reduce((s, g) => s + g.cost, 0)
  const totalSaved = state.data!.goals.reduce((s, g) => s + g.saved, 0)

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Goals</h1>
        <p class="card__hint">
          Everything you are saving toward. Mark one as the <strong>emergency fund</strong> and the
          planner will drive both its target and its priority weighting from that entry.
        </p>
      </div>
    </div>

    <form class="form-grid" id="goal-form" data-mode="create" data-id="" autocomplete="off">
      ${field('Goal name', 'name', { placeholder: 'Sewing machine', required: true })}
      ${field('Target cost', 'cost', { type: 'number', step: '0.01', min: '0', placeholder: '15000', required: true })}
      ${field('Already saved', 'saved', { type: 'number', step: '0.01', min: '0', placeholder: '3000' })}
      ${selectField('Type', 'type', [
        { value: 'custom', label: 'Custom goal' },
        { value: 'emergency_fund', label: 'Emergency fund' },
      ], 'custom')}
      <div class="row span-all">
        <button class="btn" type="submit" id="goal-submit">Add goal</button>
        <button class="btn btn--subtle" type="button" data-action="goal-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Goals tracked', String(state.data!.goals.length), `${money(totalTarget)} in total`)}
    ${stat('Saved so far', money(totalSaved), `${pctOf(totalTarget > 0 ? totalSaved / totalTarget : 0)} of all targets`)}
    ${stat('Monthly to goals', money(b.goalsAllocation), `+ ${money(b.emergencyAllocation)} to buffer`)}
    ${stat('Next finish line', nextGoalLabel(a), 'at the current allocation')}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Saving queue</h2></div>
      <span class="badge">Funded in order</span>
    </div>
    ${
      a.goals.length === 0
        ? emptyState('No goals yet', 'Add a goal above — a concrete target makes the monthly allocation easier to keep.')
        : `<div class="stack">${a.goals.map(goalCard).join('')}</div>`
    }
  </section>`
}

function nextGoalLabel(a: Analysis): string {
  const next = a.goals.find((g) => !g.completed)
  if (!next) return a.goals.length === 0 ? '—' : 'all done'
  return next.fundedMonth ? monthLabel(next.fundedMonth) : '—'
}

function goalCard(g: Analysis['goals'][number]): string {
  const tone = g.completed ? 'good' : g.type === 'emergency_fund' ? 'deep' : 'pink'
  return `<article class="debt">
    <div class="debt__top">
      <div>
        <div class="debt__name">${esc(g.name)}</div>
        <span class="cell-sub">
          ${g.type === 'emergency_fund' ? 'Emergency fund' : 'Custom goal'} ·
          ${esc(money(g.saved))} of ${esc(money(g.cost))}
        </span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${pctOf(g.progress)}</div>
        <span class="badge badge--${g.completed ? 'good' : 'muted'}">
          ${g.completed ? 'Funded' : g.fundedMonth ? esc(monthLabel(g.fundedMonth)) : 'no allocation'}
        </span>
      </div>
    </div>

    <div class="bar-row">
      <span class="bar-row__label">Progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${tone === 'good' ? 'good' : tone === 'deep' ? 'pink' : 'pink'}" style="width:${(g.progress * 100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${pctOf(g.progress)}</span>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Still needed</span>
        <span class="fact__value">${esc(money(g.remaining))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to fund</span>
        <span class="fact__value">${esc(durationLabel(g.monthsToFund))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Own months</span>
        <span class="fact__value">${esc(durationLabel(g.ownMonths))}</span>
      </div>
    </div>

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="goal-edit" data-id="${esc(g.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="goal-delete" data-id="${esc(g.id)}">Delete</button>
    </div>
  </article>`
}

/* ═══════════════════════ 10. Spending log ═══════════════════════════ */

function viewLog(): string {
  const a = analysis()
  const s = a.spending
  // Keep each entry's index in the *stored* array so edit/delete target the
  // right row even though the list is displayed newest-first.
  const entries = state.data!.logs
    .map((entry, idx) => ({ entry, idx }))
    .sort((x, y) => y.entry.date.localeCompare(x.entry.date))
  const maxEntry = entries.reduce((m, e) => Math.max(m, Math.abs(e.entry.amount)), 0)

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Spending log</h1>
        <p class="card__hint">
          Log what you actually spend. $honchoy compares your run-rate against the flexible-spending
          allowance from the plan, so overspending shows up early instead of at month end.
        </p>
      </div>
      <span class="badge badge--${s.onTrack ? 'good' : 'warn'}">${s.onTrack ? 'On plan' : 'Above plan'}</span>
    </div>

    <form class="form-grid" id="log-form" data-mode="create" data-idx="" autocomplete="off">
      ${field('Date', 'date', { type: 'date', value: todayISO(), required: true })}
      ${field('Amount', 'amount', { type: 'number', step: '0.01', placeholder: '1000', required: true, hint: 'positive = money out, negative = money in' })}
      ${field('Note', 'note', { placeholder: 'Groceries' })}
      <div class="row span-all">
        <button class="btn" type="submit" id="log-submit">Add entry</button>
        <button class="btn btn--subtle" type="button" data-action="log-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Logged this month', money(s.currentMonthTotal), `${s.entries} entr${s.entries === 1 ? 'y' : 'ies'} in total`)}
    ${stat('Daily average', money(s.dailyAverage), 'trailing 30 days')}
    ${stat('Projected month', money(s.projectedMonthTotal), `allowance ${money(s.allowance)}`, s.onTrack ? undefined : 'danger')}
    ${stat(
      s.overUnder >= 0 ? 'Over plan by' : 'Under plan by',
      money(Math.abs(s.overUnder)),
      s.onTrack ? 'inside the plan' : 'trim spending or raise income',
      s.overUnder >= 0 ? 'danger' : 'good',
    )}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Entries</h2></div>
        <span class="muted small">${money(s.totalLogged)} logged all time</span>
      </div>
      ${
        entries.length === 0
          ? emptyState('Nothing logged yet', 'Add today’s spending above — a few days of entries is enough to see a trend.')
          : `<ul class="items">
          ${entries
            .map(
              ({ entry: l, idx }) => `<li>
              <div class="items__main">
                <span class="cell-title">${esc(l.note || 'Spending')}</span>
                <span class="cell-sub">${esc(l.date)}</span>
              </div>
              <div class="items__side">
                <strong class="tabnum" style="color:${l.amount < 0 ? 'var(--good)' : 'inherit'}">${esc(money(l.amount))}</strong>
                <button class="icon-action" data-action="log-edit" data-idx="${idx}">Edit</button>
                <button class="icon-action icon-action--danger" data-action="log-delete" data-idx="${idx}">Delete</button>
              </div>
            </li>`,
            )
            .join('')}
        </ul>`
      }
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Pace</h2></div></div>
      ${spendingPace(a)}
      <hr class="divider">
      <div class="card__title"><h3>Largest entries</h3></div>
      <div style="margin-top:var(--space-3)">
        ${
          entries.length === 0
            ? `<p class="muted small">No entries yet.</p>`
            : entries
                .map(({ entry: l }) => l)
                .sort((x, y) => y.amount - x.amount)
                .slice(0, 6)
                .map((l) => barRow(l.note || l.date, Math.abs(l.amount), maxEntry || 1, 'deep', money(l.amount)))
                .join('')
        }
      </div>
    </section>
  </div>`
}

/* ═══════════════════════ 11. Data & settings ═══════════════════════════ */

function viewData(): string {
  const a = analysis()
  const json = JSON.stringify(state.data, null, 2)

  return `
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Data &amp; settings</h1>
        <p class="card__hint">
          Your plan lives in this browser only — nothing is uploaded anywhere. Export a JSON copy to
          back it up or move it to another device, and import it back any time.
        </p>
      </div>
      <span class="badge badge--${storageOk ? 'good' : 'warn'}">
        ${storageOk ? 'Saved on this device' : 'Local storage unavailable'}
      </span>
    </div>

    <div class="grid grid--4">
      <div class="field">
        <label for="data-currency">Currency</label>
        <select class="select" id="data-currency" data-option="currency">
          ${CURRENCIES.map(
            (c) => `<option value="${c}"${state.data!.user.currency === c ? ' selected' : ''}>${c}</option>`,
          ).join('')}
        </select>
        <span class="hint">Used for every amount shown.</span>
      </div>
      <div class="field">
        <label for="data-language">Language</label>
        <select class="select" id="data-language" data-option="language">
          <option value="en"${state.data!.user.language === 'en' ? ' selected' : ''}>English</option>
          <option value="mn"${state.data!.user.language === 'mn' ? ' selected' : ''}>Монгол</option>
        </select>
        <span class="hint">Stored with your data for future use.</span>
      </div>
      <div class="field">
        <span class="field__label">Age confirmation</span>
        <label class="row" style="gap:8px">
          <input type="checkbox" data-option="ageConfirmed"${state.data!.user.ageConfirmed ? ' checked' : ''}>
          <span class="small">I am old enough to manage my own finances</span>
        </label>
        <span class="hint">Required before debt tools are used.</span>
      </div>
      <div class="field">
        <span class="field__label">Plan snapshot</span>
        <ul class="small muted" style="margin:0;padding-left:18px">
          <li>${state.data!.expenses.length} expenses</li>
          <li>${state.data!.debts.length} debts</li>
          <li>${state.data!.goals.length} goals</li>
          <li>${state.data!.logs.length} log entries</li>
        </ul>
      </div>
    </div>

    <hr class="divider">

    <div class="row">
      <button class="btn" type="button" data-action="export-download">Download JSON</button>
      <button class="btn btn--ghost" type="button" data-action="export-copy">Copy JSON</button>
      <button class="btn btn--ghost" type="button" data-action="share-link">Copy share link</button>
      <button class="btn btn--ghost" type="button" data-action="import-open">Import JSON</button>
      <button class="btn btn--ghost" type="button" data-action="load-sample">Load sample data</button>
      <button class="btn btn--subtle" type="button" data-action="wipe">Clear everything</button>
    </div>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Your data shape</h2></div>
        <span class="badge">Read-only</span>
      </div>
      <p class="small muted">
        This is the exact object $honchoy stores and calculates from. Copy it to script a
        calculation via <code class="mono">POST /api/calculate</code>.
      </p>
      <textarea class="textarea" id="data-json" readonly rows="18" aria-label="Current data as JSON">${esc(json)}</textarea>
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>About $honchoy</h2></div></div>
      <p class="small">
        Version 1.0.0 · engine <code class="mono">computeFinancials()</code>, generated
        ${esc(new Date(a.generatedAt).toLocaleString())}.
      </p>
      <dl class="kv">
        <dt>Income</dt><dd>${esc(money(a.income.monthly))} / month</dd>
        <dt>Expenses</dt><dd>${esc(money(a.expenses.total))} / month</dd>
        <dt>Debt owed</dt><dd>${esc(money(a.debts.totalOwed))}</dd>
        <dt>Remainder</dt><dd>${esc(money(a.budget.remainder))} / month</dd>
      </dl>
      <hr class="divider">
      <p class="small muted">
        $honchoy is an educational planning tool. It is not a lender, not a licensed adviser and not
        a substitute for reading your own loan contracts.
      </p>
    </section>
  </div>`
}

/* ═══════════════════════ 12. Render ═══════════════════════════ */

function renderNav(): void {
  const nav = $('#nav')
  if (!nav) return
  nav.innerHTML = ROUTES.map(
    (r) =>
      `<a href="#/${r.id}"${state.route === r.id ? ' aria-current="page"' : ''}>
        <span aria-hidden="true">${r.icon}</span>${esc(r.label)}
      </a>`,
  ).join('')
}

function renderCurrency(): void {
  const sel = $('#currency-select') as HTMLSelectElement | null
  if (!sel) return
  if (sel.options.length === 0) {
    sel.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join('')
  }
  sel.value = state.data!.user.currency || 'USD'
}

function render(): void {
  const app = $('#app')
  if (!app) return
  renderNav()
  renderCurrency()

  const views: Record<RouteId, () => string> = {
    dashboard: viewDashboard,
    expenses: viewExpenses,
    debts: viewDebts,
    budget: viewBudget,
    goals: viewGoals,
    log: viewLog,
    data: viewData,
  }
  app.innerHTML = views[state.route]()
}

/* ═══════════════════════ 13. Mutations ═══════════════════════════ */

function findExpense(id: string): Expense | undefined {
  return state.data!.expenses.find((e) => e.id === id)
}

function findDebt(id: string): Debt | undefined {
  return state.data!.debts.find((d) => d.id === id)
}

function resetExpenseForm(): void {
  const form = $('#expense-form') as HTMLFormElement | null
  if (!form) return
  form.reset()
  form.dataset.mode = 'create'
  form.dataset.id = ''
  const submit = $('#expense-submit')
  if (submit) submit.textContent = 'Add expense'
  const cancel = $('[data-action="expense-cancel"]') as HTMLElement | null
  if (cancel) cancel.hidden = true
}

function resetDebtForm(): void {
  const form = $('#debt-form') as HTMLFormElement | null
  if (!form) return
  form.reset()
  form.dataset.mode = 'create'
  form.dataset.id = ''
  const submit = $('#debt-submit')
  if (submit) submit.textContent = 'Add debt'
  const cancel = $('[data-action="debt-cancel"]') as HTMLElement | null
  if (cancel) cancel.hidden = true
}

function resetGoalForm(): void {
  const form = $('#goal-form') as HTMLFormElement | null
  if (!form) return
  form.reset()
  form.dataset.mode = 'create'
  form.dataset.id = ''
  const submit = $('#goal-submit')
  if (submit) submit.textContent = 'Add goal'
  const cancel = $('[data-action="goal-cancel"]') as HTMLElement | null
  if (cancel) cancel.hidden = true
}

function resetLogForm(): void {
  const form = $('#log-form') as HTMLFormElement | null
  if (!form) return
  form.reset()
  form.dataset.mode = 'create'
  form.dataset.idx = ''
  const date = form.querySelector<HTMLInputElement>('[name="date"]')
  if (date) date.value = todayISO()
  const submit = $('#log-submit')
  if (submit) submit.textContent = 'Add entry'
  const cancel = $('[data-action="log-cancel"]') as HTMLElement | null
  if (cancel) cancel.hidden = true
}

/* ═══════════════════════ 14. Event wiring ═══════════════════════════ */

function routeFromHash(): RouteId {
  const id = (location.hash.replace(/^#\/?/, '') || 'dashboard') as RouteId
  return ROUTES.some((r) => r.id === id) ? id : 'dashboard'
}

// Navigation + hash routing.
window.addEventListener('hashchange', () => {
  state.route = routeFromHash()
  render()
  window.scrollTo({ top: 0 })
})

// One delegated submit handler for every form in the app.
document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement
  if (!form?.id) return
  const fd = new FormData(form)
  const numOf = (k: string) => {
    const v = Number.parseFloat(String(fd.get(k) ?? ''))
    return Number.isFinite(v) ? v : 0
  }

  switch (form.id) {
    case 'expense-form': {
      event.preventDefault()
      const payload: Expense = {
        category: String(fd.get('category') ?? 'other').toLowerCase(),
        name: String(fd.get('name') ?? '').trim() || 'Expense',
        amount: round2(numOf('amount')),
        type: fd.get('type') === 'variable' ? 'variable' : 'fixed',
      }
      if (payload.amount <= 0) return toast('Enter an amount greater than zero.')
      const editing = form.dataset.mode === 'edit' && form.dataset.id
      if (editing) {
        const target = findExpense(form.dataset.id!)
        if (target) Object.assign(target, payload)
        toast('Expense updated.')
      } else {
        state.data!.expenses.push({ ...payload, id: uid('e') })
        toast('Expense added.')
      }
      resetExpenseForm()
      refresh()
      return
    }

    case 'debt-form': {
      event.preventDefault()
      const payload: Debt = {
        type: (fd.get('type') as DebtType) ?? 'bank_loan',
        name: String(fd.get('name') ?? '').trim() || undefined,
        amount: round2(numOf('amount')),
        interestRate: round2(numOf('interestRate')),
        minMonthlyPayment: round2(numOf('minMonthlyPayment')),
      }
      if (payload.amount <= 0) return toast('Enter how much is still owed.')
      const editing = form.dataset.mode === 'edit' && form.dataset.id
      if (editing) {
        const target = findDebt(form.dataset.id!)
        if (target) Object.assign(target, payload)
        toast('Debt updated.')
      } else {
        state.data!.debts.push({ ...payload, id: uid('d') })
        toast('Debt added.')
      }
      resetDebtForm()
      refresh()
      return
    }

    case 'goal-form': {
      event.preventDefault()
      const payload: Goal = {
        id: uid('g'),
        name: String(fd.get('name') ?? '').trim() || 'Goal',
        cost: round2(numOf('cost')),
        saved: round2(numOf('saved')),
        type: fd.get('type') === 'emergency_fund' ? 'emergency_fund' : 'custom',
      }
      if (payload.cost <= 0) return toast('Enter a target cost.')
      const editing = form.dataset.mode === 'edit' && form.dataset.id
      if (editing) {
        const target = state.data!.goals.find((g) => g.id === form.dataset.id)
        if (target) Object.assign(target, payload, { id: target.id })
        toast('Goal updated.')
      } else {
        // Only one emergency-fund entry can exist; it drives the buffer target.
        if (payload.type === 'emergency_fund') {
          state.data!.goals = state.data!.goals.map((g) =>
            g.type === 'emergency_fund' ? { ...g, type: 'custom' as const } : g,
          )
        }
        state.data!.goals.push(payload)
        toast('Goal added.')
      }
      resetGoalForm()
      refresh()
      return
    }

    case 'log-form': {
      event.preventDefault()
      const entry: LogEntry = {
        date: String(fd.get('date') ?? todayISO()),
        amount: round2(numOf('amount')),
        note: String(fd.get('note') ?? '').trim(),
      }
      if (entry.amount === 0) return toast('Enter an amount.')
      const idx = Number(form.dataset.idx)
      if (form.dataset.mode === 'edit' && Number.isInteger(idx) && state.data!.logs[idx]) {
        state.data!.logs[idx] = entry
        toast('Entry updated.')
      } else {
        state.data!.logs.push(entry)
        toast('Entry added.')
      }
      resetLogForm()
      refresh()
      return
    }

    case 'income-form': {
      event.preventDefault()
      const name = String(fd.get('sourceName') ?? '').trim() || 'Income'
      const amount = round2(numOf('sourceAmount'))
      state.data!.income.type = (fd.get('type') as IncomeType) ?? 'monthly'
      if (amount > 0) {
        state.data!.income.sources.push({ name, amount })
        toast(`Added ${name}.`)
      } else {
        toast('Amount must be greater than zero.')
      }
      form.reset()
      refresh()
      return
    }
  }
})

// One delegated click handler.
document.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-action]')
  if (!target) return
  const action = target.dataset.action!
  const id = target.dataset.id ?? ''
  const data = state.data!

  switch (action) {
    /* ── expenses ── */
    case 'expense-edit': {
      const item = findExpense(id)
      const form = $('#expense-form') as HTMLFormElement | null
      if (!item || !form) return
      form.dataset.mode = 'edit'
      form.dataset.id = id
      setField(form, 'name', item.name)
      setField(form, 'category', item.category)
      setField(form, 'amount', String(item.amount))
      setField(form, 'type', item.type)
      const submit = $('#expense-submit')
      if (submit) submit.textContent = 'Save expense'
      const cancel = $('[data-action="expense-cancel"]') as HTMLElement | null
      if (cancel) cancel.hidden = false
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      form.querySelector<HTMLInputElement>('[name="name"]')?.focus()
      return
    }
    case 'expense-cancel':
      resetExpenseForm()
      return
    case 'expense-delete': {
      const item = findExpense(id)
      if (item && confirm(`Delete “${item.name}”?`)) {
        data.expenses = data.expenses.filter((e) => e.id !== id)
        toast('Expense deleted.')
        refresh()
      }
      return
    }

    /* ── debts ── */
    case 'debt-edit': {
      const item = findDebt(id)
      const form = $('#debt-form') as HTMLFormElement | null
      if (!item || !form) return
      form.dataset.mode = 'edit'
      form.dataset.id = id
      setField(form, 'type', item.type)
      setField(form, 'name', item.name ?? '')
      setField(form, 'amount', String(item.amount))
      setField(form, 'interestRate', String(item.interestRate))
      setField(form, 'minMonthlyPayment', String(item.minMonthlyPayment))
      const submit = $('#debt-submit')
      if (submit) submit.textContent = 'Save debt'
      const cancel = $('[data-action="debt-cancel"]') as HTMLElement | null
      if (cancel) cancel.hidden = false
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    case 'debt-cancel':
      resetDebtForm()
      return
    case 'debt-delete': {
      const item = findDebt(id)
      if (item && confirm(`Delete “${item.name || debtLabel(item.type)}”?`)) {
        data.debts = data.debts.filter((d) => d.id !== id)
        toast('Debt deleted.')
        refresh()
      }
      return
    }
    case 'strategy': {
      state.options!.strategy = target.dataset.value === 'snowball' ? 'snowball' : 'avalanche'
      toast(state.options!.strategy === 'avalanche' ? 'Clearing highest-rate debts first.' : 'Clearing smallest balances first.')
      refresh()
      return
    }

    /* ── goals ── */
    case 'goal-edit': {
      const item = data.goals.find((g) => g.id === id)
      const form = $('#goal-form') as HTMLFormElement | null
      if (!item || !form) return
      form.dataset.mode = 'edit'
      form.dataset.id = id
      setField(form, 'name', item.name)
      setField(form, 'cost', String(item.cost))
      setField(form, 'saved', String(item.saved))
      setField(form, 'type', item.type)
      const submit = $('#goal-submit')
      if (submit) submit.textContent = 'Save goal'
      const cancel = $('[data-action="goal-cancel"]') as HTMLElement | null
      if (cancel) cancel.hidden = false
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    case 'goal-cancel':
      resetGoalForm()
      return
    case 'goal-delete': {
      const item = data.goals.find((g) => g.id === id)
      if (item && confirm(`Delete “${item.name}”?`)) {
        data.goals = data.goals.filter((g) => g.id !== id)
        toast('Goal deleted.')
        refresh()
      }
      return
    }

    /* ── log ── */
    case 'log-edit': {
      const idx = Number(target.dataset.idx)
      const entry = data.logs[idx]
      const form = $('#log-form') as HTMLFormElement | null
      if (!entry || !form) return
      form.dataset.mode = 'edit'
      form.dataset.idx = String(idx)
      setField(form, 'date', entry.date)
      setField(form, 'amount', String(entry.amount))
      setField(form, 'note', entry.note ?? '')
      const submit = $('#log-submit')
      if (submit) submit.textContent = 'Save entry'
      const cancel = $('[data-action="log-cancel"]') as HTMLElement | null
      if (cancel) cancel.hidden = false
      form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    case 'log-cancel':
      resetLogForm()
      return
    case 'log-delete': {
      const idx = Number(target.dataset.idx)
      if (Number.isInteger(idx) && data.logs[idx] && confirm('Delete this log entry?')) {
        data.logs.splice(idx, 1)
        toast('Entry deleted.')
        refresh()
      }
      return
    }

    /* ── income ── */
    case 'income-delete': {
      const idx = Number(target.dataset.idx)
      if (Number.isInteger(idx) && data.income.sources[idx]) {
        data.income.sources.splice(idx, 1)
        toast('Income source removed.')
        refresh()
      }
      return
    }

    /* ── data tools ── */
    case 'export-download':
      download(`honchoy-${todayISO()}.json`, JSON.stringify(data, null, 2))
      toast('Downloaded your data.')
      return
    case 'export-copy':
      toast((await copy(JSON.stringify(data, null, 2))) ? 'Copied to clipboard.' : 'Copy failed — use Download instead.')
      return
    case 'share-link': {
      const url = `${location.origin}${location.pathname}?d=${encodeURIComponent(JSON.stringify(data))}`
      toast((await copy(url)) ? 'Share link copied.' : 'Could not copy the link.')
      return
    }
    case 'import-open':
      openModal(
        'Import a $honchoy plan',
        `<p class="small muted">Paste an exported JSON snapshot below.</p>
         <div class="field">
           <label for="import-json">JSON</label>
           <textarea class="textarea" id="import-json" rows="10" placeholder='{ "app": "$honchoy", ... }'></textarea>
         </div>
         <div class="field" style="margin-top:var(--space-3)">
           <label for="import-file">…or choose a file</label>
           <input class="input" type="file" id="import-file" accept="application/json,.json">
         </div>
         <div class="row row--end" style="margin-top:var(--space-4)">
           <button class="btn btn--ghost" type="button" data-action="modal-close">Cancel</button>
           <button class="btn" type="button" data-action="import-run">Import</button>
         </div>`,
      )
      return
    case 'import-run': {
      const area = $('#import-json') as HTMLTextAreaElement | null
      const file = ($('#import-file') as HTMLInputElement | null)?.files?.[0]
      const readFile = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result ?? ''))
          reader.onerror = () => reject(new Error('read failed'))
          reader.readAsText(f)
        })
      try {
        const text = file ? await readFile(file) : String(area?.value ?? '')
        if (!text.trim()) return toast('Nothing to import.')
        const parsed = normalizeData(JSON.parse(text))
        state.data = ensureIds(parsed)
        closeModal()
        toast('Plan imported.')
        refresh()
      } catch {
        toast('That JSON could not be read.')
      }
      return
    }
    case 'load-sample':
      if (confirm('Replace your current plan with the sample data?')) {
        state.data = ensureIds(JSON.parse(JSON.stringify(SAMPLE_DATA)) as HonchoyData)
        toast('Sample data loaded.')
        refresh()
      }
      return
    case 'wipe':
      if (confirm('Delete every expense, debt, goal and log entry? This cannot be undone.')) {
        state.data = ensureIds(emptyData())
        toast('All data cleared.')
        refresh()
      }
      return
    case 'options-reset':
      state.options = { ...DEFAULT_OPTIONS }
      toast('Plan settings reset.')
      refresh()
      return
    case 'modal-close':
      closeModal()
      return
  }
})

// Delegated input handling: options, sliders and inline settings.
document.addEventListener('input', (event) => {
  const el = event.target as HTMLInputElement
  if (!el?.dataset) return

  // Live label for the extra-payment slider (avoid re-rendering mid-drag).
  if (el.dataset.action === 'extra-payment') {
    const value = Number(el.value) || 0
    state.options!.extraDebtPayment = value
    const label = $('#extra-value')
    if (label) label.textContent = `${money(value)} extra`
    const total = $('#extra-total')
    if (total) total.textContent = `${money(analysis().debts.totalMinMonthlyPayment + value)} / month`
    return
  }

  // Generic option inputs write straight into state.options.
  if (el.dataset.option) {
    applyOption(el.dataset.option, el)
    return
  }
})

// Commit sliders on release, then recalculate once.
document.addEventListener('change', (event) => {
  const el = event.target as HTMLInputElement
  if (!el?.dataset) return

  if (el.dataset.action === 'extra-payment') {
    state.options!.extraDebtPayment = Math.max(0, Number(el.value) || 0)
    refresh()
    return
  }
  if (el.dataset.option) {
    applyOption(el.dataset.option, el)
    refresh()
    return
  }
  // The currency picker lives in the top bar, outside the delegated views.
  if (el.id === 'currency-select') {
    state.data!.user.currency = el.value
    toast(`Currency set to ${el.value}.`)
    refresh()
  }
})

/** Single mapping of `data-option` attributes onto state. */
function applyOption(name: string, el: HTMLInputElement | HTMLSelectElement): void {
  const data = state.data!
  const numeric = Number(el.value)

  switch (name) {
    case 'currency':
      data.user.currency = el.value
      return
    case 'language':
      data.user.language = el.value
      return
    case 'ageConfirmed':
      data.user.ageConfirmed = (el as HTMLInputElement).checked
      return
    case 'extraDebtPayment':
      state.options!.extraDebtPayment = Math.max(0, Number.isFinite(numeric) ? numeric : 0)
      return
    case 'emergencyMonths':
      state.options!.emergencyMonths = Math.min(24, Math.max(1, Math.round(numeric) || 3))
      return
    case 'dtiWatchPct':
      state.options!.dtiWatch = Math.min(0.6, Math.max(0.05, (numeric || 30) / 100))
      return
    case 'dtiMaxPct':
      state.options!.dtiMax = Math.min(0.8, Math.max(0.1, (numeric || 40) / 100))
      return
    case 'highInterestWarn':
      state.options!.highInterestWarn = Math.max(1, numeric || 25)
      return
    case 'highInterestDanger':
      state.options!.highInterestDanger = Math.max(1, numeric || 40)
      return
  }
}

/** Set a form control by name (used when opening an edit form). */
function setField(form: HTMLFormElement, name: string, value: string): void {
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null
  if (el) el.value = value
}

// Modal chrome.
$('#modal-close')?.addEventListener('click', closeModal)
$('#modal')?.addEventListener('click', (event) => {
  // Click on the backdrop closes the dialog.
  if (event.target === $('#modal')) closeModal()
})

/* ═══════════════════════ 15. Boot ═══════════════════════════ */

function boot(): void {
  const { data, options } = load()
  state.data = data
  state.options = options
  state.route = routeFromHash()
  state.analysis = computeFinancials({ data, options })

  const banner = $('#storage-banner')
  if (banner) banner.hidden = storageOk

  render()
}

boot()

// Expose the engine in the console for anyone who wants to poke at the maths.
;(window as unknown as Record<string, unknown>).honchoy = {
  state,
  computeFinancials,
  get analysis() {
    return state.analysis
  },
}
