/**
 * $honchoy — the financial engine.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  This module is intentionally dependency-free and side-effect-free.  │
 * │  It is imported by the Cloudflare Worker (for the API) *and* by the  │
 * │  browser (for instant, offline-first recalculation), so both always  │
 * │  produce byte-identical numbers from the same input.                 │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 *  The single entry point is `computeFinancials()`. Everything it needs is
 *  passed in as arguments — no globals, no clock reads, no I/O. Small pure
 *  helpers above it (amortisation, parsing, formatting) are private details
 *  of that one calculation.
 */

import type {
  Analysis,
  BudgetAllocation,
  BudgetPlan,
  Debt,
  DebtAnalysis,
  DebtBreakdown,
  DebtPlan,
  DebtType,
  Expense,
  ExpenseAnalysis,
  Flag,
  Goal,
  GoalProjection,
  HonchoyData,
  IncomeAnalysis,
  IncomeType,
  PayoffEstimate,
  Severity,
  SpendingPace,
} from './types'

/* ═══════════════════════════════════════════════════════════════════════ *
 *  1. Tunable constants
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Every threshold the engine reasons about, in one place, so the numbers in
 * the UI can always be traced back to a named rule.
 */
export interface EngineOptions {
  /** Debt-to-income above this is a warning ("expensive"). 0.30 = 30%. */
  dtiWatch: number
  /** Debt-to-income above this is critical. 0.40 = 40%. */
  dtiMax: number
  /** Annual rate (%) at which a single debt is flagged as expensive. */
  highInterestWarn: number
  /** Annual rate (%) at which a single debt is flagged as alarming. */
  highInterestDanger: number
  /** Months of living costs the emergency fund should cover. */
  emergencyMonths: number
  /** Extra money per month the user wants to throw at debt, on top of minimums. */
  extraDebtPayment: number
  /** Which order to clear debts in during the payoff simulation. */
  strategy: 'avalanche' | 'snowball'
  /** Share of the remainder the emergency fund normally takes once fully funded. */
  emergencyMaintenanceWeight: number
}

export const DEFAULT_OPTIONS: EngineOptions = {
  dtiWatch: 0.3,
  dtiMax: 0.4,
  highInterestWarn: 25,
  highInterestDanger: 40,
  emergencyMonths: 3,
  extraDebtPayment: 0,
  strategy: 'avalanche',
  emergencyMaintenanceWeight: 0.15,
}

/**
 * Split of the post-debt remainder once the emergency fund is saturated.
 * While the fund is short, `emergencyWeightFull` -> `emergencyWeightFunded`
 * slides linearly with how funded the buffer already is.
 */
const EMERGENCY_WEIGHT_EMPTY = 0.7
const GOALS_SHARE_OF_REST = 0.65
/** Flexible spending never drops below this share of the remainder. */
const FLEXIBLE_FLOOR = 0.1

/** Hard stop for the payoff simulations (~50 years) so a bad input can't hang. */
const MAX_SIM_MONTHS = 600

/** Tolerance for "zero" in currency comparisons. */
const EPS = 0.005

/* ═══════════════════════════════════════════════════════════════════════ *
 *  2. Small pure helpers
 * ═══════════════════════════════════════════════════════════════════════ */

/** Round to 2 decimals, killing float dust (0.1 + 0.2 -> 0.3). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Coerce anything into a finite, non-negative number. Bad input becomes 0. */
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

/** Positive-only coercion — balances, amounts, rates never go below zero. */
function pos(v: unknown): number {
  return Math.max(0, num(v))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Ratio guarded against divide-by-zero. */
function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0
}

/** Linear interpolation between two values with t clamped to 0..1. */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1)
}

/** `YYYY-MM` label for `months` after `fromISO`. Used for "debt-free by …". */
function addMonths(fromISO: string, months: number): string {
  const d = new Date(`${fromISO}T00:00:00Z`)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + months
  const year = y + Math.floor(m / 12)
  const month = ((m % 12) + 12) % 12
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/** `YYYY-MM` of the month containing `d` (UTC). */
function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** `YYYY-MM-DD` of `d` (UTC). */
function isoDate(d: Date): string {
  return `${monthKeyOf(d)}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Annual percentage -> monthly decimal rate. 20 -> 0.01666… */
function monthlyRate(annualPercent: number): number {
  return pos(annualPercent) / 100 / 12
}

/**
 * Amortise a single balance paid down with a flat monthly payment.
 *
 * Returns `months: null` when the payment never clears the balance — i.e. it
 * does not even cover the interest charged in the first month.
 */
function amortize(
  balance: number,
  annualPercent: number,
  payment: number,
  startISO: string,
): PayoffEstimate {
  const r = monthlyRate(annualPercent)
  const firstMonthInterest = round2(balance * r)
  const negativeAmortization = payment <= 0 || payment + EPS <= balance * r

  if (balance <= EPS) {
    return {
      months: 0,
      payoffMonth: startISO.slice(0, 7),
      totalInterest: 0,
      totalPaid: 0,
      paymentUsed: round2(payment),
      negativeAmortization: false,
    }
  }
  if (negativeAmortization) {
    return {
      months: null,
      payoffMonth: null,
      totalInterest: 0,
      totalPaid: 0,
      paymentUsed: round2(payment),
      negativeAmortization: true,
    }
  }

  let bal = balance
  let interestTotal = 0
  let months = 0
  for (let m = 0; m < MAX_SIM_MONTHS && bal > EPS; m++) {
    const interest = bal * r
    let principal = payment - interest
    if (principal > bal) principal = bal // final, smaller payment
    const paid = principal + interest
    bal -= principal
    interestTotal += interest
    months++
    if (paid <= 0) break
  }

  const cleared = bal <= EPS
  void firstMonthInterest
  return {
    months: cleared ? months : null,
    payoffMonth: cleared ? addMonths(startISO, months) : null,
    totalInterest: round2(interestTotal),
    totalPaid: round2(balance + interestTotal),
    paymentUsed: round2(payment),
    negativeAmortization: false,
  }
}

/** A debt is "cleared" in a simulation once the balance is within a cent. */
const isCleared = (balance: number) => balance <= EPS

interface SimDebt {
  id: string
  name: string
  balance: number
  rate: number
  minPayment: number
}

/**
 * Multi-debt payoff simulation with a fixed monthly pool.
 *
 * Each month: interest accrues on every open balance, minimums are paid, then
 * whatever is left of the pool is aimed at one target debt.
 *  - `avalanche` targets the highest interest rate  (cheapest overall)
 *  - `snowball`  targets the smallest balance       (fastest psychological win)
 */
function simulatePlan(
  debts: SimDebt[],
  pool: number,
  strategy: 'avalanche' | 'snowball',
  startISO: string,
): Omit<DebtPlan, 'alternate' | 'underfunded'> {
  const totalMinimums = debts.reduce((s, d) => s + d.minPayment, 0)

  // The pool cannot even service the minimums: nothing will ever be repaid.
  if (debts.length === 0 || pool + EPS < totalMinimums) {
    return {
      monthlyPool: round2(pool),
      months: debts.length === 0 ? 0 : null,
      totalInterest: 0,
      totalPaid: 0,
      debtFreeMonth: debts.length === 0 ? startISO.slice(0, 7) : null,
      strategy,
      payoffOrder: [],
    }
  }

  // Work on copies; sort so the "snowball target" is simply the first open debt.
  const open: SimDebt[] = debts.map((d) => ({ ...d }))
  const order: { id: string; name: string; month: number }[] = []
  const sortOpen = (list: SimDebt[]) =>
    list.sort((a, b) =>
      strategy === 'avalanche' ? b.rate - a.rate || a.balance - b.balance : a.balance - b.balance,
    )

  let month = 0
  let interestTotal = 0
  let paidTotal = 0

  while (month < MAX_SIM_MONTHS) {
    const active = open.filter((d) => !isCleared(d.balance))
    if (active.length === 0) break
    month++
    sortOpen(active)

    // 1) Interest accrues on every live balance.
    for (const d of active) {
      const interest = d.balance * monthlyRate(d.rate)
      d.balance += interest
      interestTotal += interest
    }

    // 2) Minimums, capped at whatever is actually owed.
    let spent = 0
    for (const d of active) {
      const due = Math.min(d.minPayment, d.balance)
      d.balance -= due
      spent += due
      paidTotal += due
    }

    // 3) Leftover pool -> the single target debt (first in sorted order).
    let extra = pool - spent
    for (const d of active) {
      if (extra <= EPS) break
      const due = Math.min(extra, d.balance)
      d.balance -= due
      extra -= due
      paidTotal += due
    }

    // 4) Record anything that just hit zero.
    for (const d of active) {
      if (isCleared(d.balance) && !order.some((o) => o.id === d.id)) {
        order.push({ id: d.id, name: d.name, month })
      }
    }
  }

  const clearedAll = open.every((d) => isCleared(d.balance))
  const months = clearedAll ? month : null
  return {
    monthlyPool: round2(pool),
    months,
    totalInterest: round2(interestTotal),
    totalPaid: round2(paidTotal),
    debtFreeMonth: months === null ? null : addMonths(startISO, months),
    strategy,
    payoffOrder: order.sort((a, b) => a.month - b.month),
  }
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  3. Labels
 * ═══════════════════════════════════════════════════════════════════════ */

const DEBT_LABELS: Record<DebtType, string> = {
  bank_loan: 'Bank loan',
  microloan: 'Microloan / MFI',
  informal: 'Informal / family loan',
  credit_purchase: 'Credit purchase',
}

export function debtLabel(type: DebtType): string {
  return DEBT_LABELS[type] ?? 'Debt'
}

/** Income frequencies -> multiplier that turns the stated amount into a month. */
const INCOME_MULTIPLIER: Record<IncomeType, number> = {
  monthly: 1,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  annual: 1 / 12,
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  4. normalizeData — coerce a snapshot into a safe, complete shape
 * ═══════════════════════════════════════════════════════════════════════ */

/** A blank $honchoy snapshot. */
export function emptyData(): HonchoyData {
  return {
    app: '$honchoy',
    user: { ageConfirmed: true, language: 'en', currency: 'USD' },
    income: { type: 'monthly', sources: [] },
    expenses: [],
    debts: [],
    goals: [],
    logs: [],
  }
}

/**
 * Defensive coercion of anything that claims to be a $honchoy snapshot:
 * drops junk rows, fixes types, fills defaults. The engine can therefore
 * assume clean input even when the data came from localStorage or a URL.
 */
export function normalizeData(input: unknown): HonchoyData {
  const base = emptyData()
  if (!input || typeof input !== 'object') return base
  const raw = input as Partial<HonchoyData>

  const incomeType: IncomeType =
    raw.income?.type && raw.income.type in INCOME_MULTIPLIER ? raw.income.type : 'monthly'

  const sources = Array.isArray(raw.income?.sources)
    ? raw.income!.sources
        .filter((s) => s && typeof s === 'object')
        .map((s) => ({ name: String(s.name ?? 'Income').slice(0, 60), amount: pos(s.amount) }))
    : []

  const expenses: Expense[] = Array.isArray(raw.expenses)
    ? raw.expenses
        .filter((e) => e && typeof e === 'object' && pos(e.amount) > 0)
        .map((e) => ({
          id: e.id ? String(e.id) : undefined,
          category: String(e.category ?? 'other').toLowerCase().slice(0, 40) || 'other',
          name: String(e.name ?? '').slice(0, 80) || String(e.category ?? 'Expense'),
          amount: round2(pos(e.amount)),
          type: e.type === 'variable' ? 'variable' : 'fixed',
        }))
    : []

  const debts: Debt[] = Array.isArray(raw.debts)
    ? raw.debts
        .filter((d) => d && typeof d === 'object' && pos(d.amount) > 0)
        .map((d) => ({
          id: d.id ? String(d.id) : undefined,
          name: d.name ? String(d.name).slice(0, 80) : undefined,
          type: (d.type in DEBT_LABELS ? d.type : 'bank_loan') as DebtType,
          amount: round2(pos(d.amount)),
          interestRate: round2(clamp(num(d.interestRate), 0, 300)),
          minMonthlyPayment: round2(pos(d.minMonthlyPayment)),
        }))
    : []

  const goals: Goal[] = Array.isArray(raw.goals)
    ? raw.goals
        .filter((g) => g && typeof g === 'object')
        .map((g, i) => ({
          id: String(g.id ?? `g${i + 1}`).slice(0, 40),
          name: String(g.name ?? 'Goal').slice(0, 80),
          cost: round2(pos(g.cost)),
          saved: round2(pos(g.saved)),
          type: g.type === 'emergency_fund' ? 'emergency_fund' : 'custom',
        }))
    : []

  const logs = Array.isArray(raw.logs)
    ? raw.logs
        .filter((l) => l && typeof l === 'object')
        .map((l) => ({
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(l.date))
            ? String(l.date)
            : new Date().toISOString().slice(0, 10),
          amount: round2(num(l.amount)),
          note: l.note ? String(l.note).slice(0, 200) : '',
        }))
    : []

  return {
    app: '$honchoy',
    user: {
      ageConfirmed: raw.user?.ageConfirmed !== false,
      language: raw.user?.language === 'mn' ? 'mn' : 'en',
      currency: String(raw.user?.currency ?? 'USD').slice(0, 8),
    },
    income: { type: incomeType, sources },
    expenses,
    debts,
    goals,
    logs,
  }
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  5. computeFinancials — THE calculation
 * ═══════════════════════════════════════════════════════════════════════ */

export interface ComputeArgs {
  data: HonchoyData | unknown
  options?: Partial<EngineOptions>
  /** Injectable clock (ISO date/datetime) so results are reproducible in tests. */
  now?: string
}

/**
 * Turn a $honchoy snapshot into a complete analysis.
 *
 * The pipeline, in order:
 *
 *   1. INCOME      — normalise every source to a monthly figure.
 *   2. EXPENSES    — split fixed vs variable, group by category.
 *   3. DEBTS       — balance, cost and risk per debt; amortise each one;
 *                    then simulate clearing them all with one monthly pool.
 *   4. BUDGET      — the automatic planner:
 *                      disposable income = income − expenses
 *                      debt carve-out   = minimums (+ optional extra)
 *                      remainder        = disposable − carve-out
 *                      remainder        → emergency fund / goals / flexible,
 *                                         weighted toward the emergency fund
 *                                         until it is fully funded.
 *   5. GOALS       — queue the goals against the goals allocation.
 *   6. SPENDING    — pace the log against the flexible allowance.
 *   7. FLAGS       — DTI, high interest, negative amortisation, missing buffer…
 *   8. HEALTH      — one 0-100 score + band, for the dashboard dial.
 *
 * @returns A fully derived `Analysis`. Pure: same input -> same output.
 */
export function computeFinancials({ data, options, now }: ComputeArgs): Analysis {
  const opts: EngineOptions = { ...DEFAULT_OPTIONS, ...(options ?? {}) }
  const d = normalizeData(data)
  const today = now ? new Date(now) : new Date()
  const startISO = isoDate(today)
  const currency = d.user.currency || 'USD'

  /* ── 1. INCOME ────────────────────────────────────────────────────── */
  // Every source is converted to a monthly amount using its frequency, so the
  // rest of the engine only ever deals with "per month" numbers.
  const multiplier = INCOME_MULTIPLIER[d.income.type] ?? 1
  const incomeSources = d.income.sources.map((s) => {
    const monthlyAmount = round2(s.amount * multiplier)
    return { name: s.name, amount: round2(s.amount), monthlyAmount, share: 0 }
  })
  const monthlyIncome = round2(incomeSources.reduce((sum, s) => sum + s.monthlyAmount, 0))
  for (const s of incomeSources) s.share = round2(ratio(s.monthlyAmount, monthlyIncome) * 100) / 100

  const income: IncomeAnalysis = {
    type: d.income.type,
    monthly: monthlyIncome,
    annual: round2(monthlyIncome * 12),
    sources: incomeSources,
  }

  /* ── 2. EXPENSES ──────────────────────────────────────────────────── */
  // Fixed costs are commitments; variable costs are the ones the user can bend.
  // The variable group matters because it sets the flexible-spending baseline.
  const totalFixedExpenses = round2(
    d.expenses.filter((e) => e.type === 'fixed').reduce((s, e) => s + e.amount, 0),
  )
  const totalVariableExpenses = round2(
    d.expenses.filter((e) => e.type === 'variable').reduce((s, e) => s + e.amount, 0),
  )
  const totalExpenses = round2(totalFixedExpenses + totalVariableExpenses)

  const categoryMap = new Map<string, { amount: number; count: number; type: 'fixed' | 'variable' }>()
  for (const e of d.expenses) {
    const entry = categoryMap.get(e.category) ?? { amount: 0, count: 0, type: e.type }
    entry.amount += e.amount
    entry.count += 1
    // A category holding any variable spend is treated as variable overall.
    if (e.type === 'variable') entry.type = 'variable'
    categoryMap.set(e.category, entry)
  }
  const byCategory = [...categoryMap.entries()]
    .map(([category, v]) => ({
      category,
      amount: round2(v.amount),
      count: v.count,
      type: v.type,
      share: round2(ratio(v.amount, totalExpenses) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount)

  const expenses: ExpenseAnalysis = {
    count: d.expenses.length,
    total: totalExpenses,
    fixed: totalFixedExpenses,
    variable: totalVariableExpenses,
    fixedShare: round2(ratio(totalFixedExpenses, totalExpenses) * 100) / 100,
    variableShare: round2(ratio(totalVariableExpenses, totalExpenses) * 100) / 100,
    incomeShare: round2(ratio(totalExpenses, monthlyIncome) * 100) / 100,
    byCategory,
  }

  /* ── 3. DEBTS ─────────────────────────────────────────────────────── */
  // Per-debt: what one month of interest costs, whether the minimum payment
  // actually shrinks the balance, how long the minimum takes to clear it, and
  // how long the user's *chosen* payment takes instead.
  const totalOwed = round2(d.debts.reduce((s, x) => s + x.amount, 0))
  const totalMinMonthlyPayment = round2(d.debts.reduce((s, x) => s + x.minMonthlyPayment, 0))

  const weightedAverageRate = round2(
    ratio(
      d.debts.reduce((s, x) => s + x.interestRate * x.amount, 0),
      totalOwed,
    ),
  )
  const highestRate = round2(d.debts.reduce((max, x) => Math.max(max, x.interestRate), 0))
  const monthlyInterestCost = round2(
    d.debts.reduce((s, x) => s + x.amount * monthlyRate(x.interestRate), 0),
  )

  const items: DebtBreakdown[] = d.debts
    .map((debt): DebtBreakdown => {
      const monthlyInterest = round2(debt.amount * monthlyRate(debt.interestRate))
      const negativeAmortization = debt.minMonthlyPayment + EPS <= monthlyInterest

      const atMinimum = amortize(debt.amount, debt.interestRate, debt.minMonthlyPayment, startISO)
      // The user's chosen payment = their minimum + whatever extra they pledged.
      // The extra is only guaranteed on the first debt in the queue, so for the
      // per-debt view we quote the minimum unless an extra is set explicitly.
      const paymentUsed = round2(debt.minMonthlyPayment + pos(opts.extraDebtPayment))
      const payoff = amortize(debt.amount, debt.interestRate, paymentUsed, startISO)

      // Severity ladder for a single debt's price.
      let severity: Severity | null = null
      let note: string | null = null
      if (negativeAmortization) {
        severity = 'high'
        note = 'The minimum payment does not cover this month’s interest — the balance grows every month.'
      } else if (debt.interestRate >= opts.highInterestDanger) {
        severity = 'high'
        note = `Very expensive money at ${debt.interestRate}% a year. Prioritise this one.`
      } else if (debt.interestRate >= opts.highInterestWarn) {
        severity = 'warn'
        note = `High rate at ${debt.interestRate}% a year — well above a typical bank loan.`
      }

      return {
        id: debt.id ?? debt.name ?? debtLabel(debt.type),
        name: debt.name || debtLabel(debt.type),
        type: debt.type,
        amount: debt.amount,
        interestRate: debt.interestRate,
        minMonthlyPayment: debt.minMonthlyPayment,
        monthlyInterest,
        principalShare: round2(
          clamp(ratio(debt.minMonthlyPayment - monthlyInterest, debt.amount), 0, 1) * 100,
        ) / 100,
        monthsAtMinimum: atMinimum.months,
        negativeAmortization,
        payoff,
        effectiveMonthlyCost: monthlyInterest,
        severity,
        note,
      }
    })
    // Most expensive first: the order the UI lists them in.
    .sort((a, b) => b.interestRate - a.interestRate || b.amount - a.amount)

  // Grouped view by borrowing channel (bank vs MFI vs family vs credit).
  const typeKeys: DebtType[] = ['bank_loan', 'microloan', 'informal', 'credit_purchase']
  const byType = typeKeys
    .map((type) => {
      const group = d.debts.filter((x) => x.type === type)
      const amount = round2(group.reduce((s, x) => s + x.amount, 0))
      return {
        type,
        count: group.length,
        amount,
        minMonthlyPayment: round2(group.reduce((s, x) => s + x.minMonthlyPayment, 0)),
        averageRate: round2(
          ratio(
            group.reduce((s, x) => s + x.interestRate * x.amount, 0),
            amount,
          ),
        ),
      }
    })
    .filter((g) => g.count > 0)

  // Debt-to-income: the classic affordability test on *contractual* payments.
  const dti = round2(ratio(totalMinMonthlyPayment, monthlyIncome) * 100) / 100

  // Simulate clearing everything: pool = minimums + any extra the user pledged.
  const simDebts: SimDebt[] = d.debts.map((x, i) => ({
    id: x.id ?? `d${i + 1}`,
    name: x.name || debtLabel(x.type),
    balance: x.amount,
    rate: x.interestRate,
    minPayment: x.minMonthlyPayment,
  }))
  const monthlyPool = round2(totalMinMonthlyPayment + pos(opts.extraDebtPayment))
  const primaryStrategy = opts.strategy === 'snowball' ? 'snowball' : 'avalanche'
  const alternateStrategy = primaryStrategy === 'avalanche' ? 'snowball' : 'avalanche'

  const primary = simulatePlan(simDebts, monthlyPool, primaryStrategy, startISO)
  const alternateSim = simulatePlan(simDebts, monthlyPool, alternateStrategy, startISO)

  const plan: DebtPlan = {
    ...primary,
    underfunded: d.debts.length > 0 && monthlyPool + EPS < totalMinMonthlyPayment,
    alternate: {
      strategy: alternateStrategy,
      months: alternateSim.months,
      totalInterest: alternateSim.totalInterest,
    },
  }

  const debts: DebtAnalysis = {
    count: d.debts.length,
    totalOwed,
    totalMinMonthlyPayment,
    weightedAverageRate,
    highestRate,
    monthlyInterestCost,
    dti,
    byType,
    items,
    plan,
    hasNegativeAmortization: items.some((i) => i.negativeAmortization),
  }

  /* ── 4. BUDGET PLANNER ────────────────────────────────────────────── */
  //
  //  income ──▶ minus living expenses ──▶ DISPOSABLE
  //                                       │
  //                                       ├─ minus DEBT CARVE-OUT (minimums + extra)
  //                                       │
  //                                       ▼
  //                                    REMAINDER
  //                                       │
  //        ┌──────────────────────────────┼──────────────────────────────┐
  //        ▼                              ▼                              ▼
  //   EMERGENCY FUND                     GOALS                    FLEXIBLE SPENDING
  //
  //  The emergency fund is weighted heavily *until it is fully funded*; after
  //  that its share collapses to a maintenance level and the freed money flows
  //  to goals and day-to-day spending.
  //
  const disposableIncome = round2(monthlyIncome - totalExpenses)
  const debtCarveOut = round2(totalMinMonthlyPayment + pos(opts.extraDebtPayment))
  const debtShortfall = round2(Math.max(0, debtCarveOut - Math.max(0, disposableIncome)))
  const remainder = round2(Math.max(0, disposableIncome - debtCarveOut))
  const remainderShare = round2(ratio(remainder, monthlyIncome) * 100) / 100

  // The emergency-fund target: an explicit `emergency_fund` goal wins, otherwise
  // default to N months of living costs. `saved` comes from the same goal, or
  // from any custom goal the user named as their buffer.
  const efGoal = d.goals.find((g) => g.type === 'emergency_fund')
  const emergencyTarget = round2(
    efGoal ? efGoal.cost : totalExpenses * Math.max(1, opts.emergencyMonths),
  )
  const emergencySaved = round2(efGoal ? efGoal.saved : 0)
  const emergencyGap = round2(Math.max(0, emergencyTarget - emergencySaved))
  const emergencyFullyFunded = emergencyGap <= EPS || emergencyTarget <= EPS
  const fundedRatio = round2(clamp(ratio(emergencySaved, emergencyTarget), 0, 1) * 100) / 100

  // Weighting. `remaining` is everything left after the emergency fund's cut.
  const emergencyWeight = emergencyFullyFunded
    ? opts.emergencyMaintenanceWeight
    : round2(lerp(EMERGENCY_WEIGHT_EMPTY, opts.emergencyMaintenanceWeight, fundedRatio) * 100) / 100
  const remainingWeight = round2(1 - emergencyWeight)

  // With goals still open, goals take most of what the buffer doesn't; with no
  // goals, the money becomes spending money.
  const openGoals = d.goals.filter((g) => g.type !== 'emergency_fund' && g.cost - g.saved > EPS)
  let goalsWeight = openGoals.length > 0 ? round2(remainingWeight * GOALS_SHARE_OF_REST * 100) / 100 : 0
  let flexibleWeight = round2((remainingWeight - goalsWeight) * 100) / 100

  // Never starve flexible spending to zero — a plan with no room to live is not
  // a plan anyone follows. Clamp it up and take the difference from goals.
  if (remainder > 0 && flexibleWeight < FLEXIBLE_FLOOR && goalsWeight > 0) {
    const moved = FLEXIBLE_FLOOR - flexibleWeight
    flexibleWeight = FLEXIBLE_FLOOR
    goalsWeight = Math.max(0, round2((goalsWeight - moved) * 100) / 100)
    flexibleWeight = round2((1 - emergencyWeight - goalsWeight) * 100) / 100
  }

  const toAmount = (w: number) => round2(remainder * w)

  const allocations: BudgetAllocation[] = [
    {
      key: 'emergency',
      amount: toAmount(emergencyWeight),
      weight: emergencyWeight,
      rationale: emergencyFullyFunded
        ? 'Buffer already funded — keeping up a small top-up only.'
        : `Buffer is ${Math.round(fundedRatio * 100)}% funded, so it takes the largest share.`,
    },
    {
      key: 'goals',
      amount: toAmount(goalsWeight),
      weight: goalsWeight,
      rationale:
        goalsWeight > 0
          ? `Saving toward ${openGoals.length} open goal${openGoals.length === 1 ? '' : 's'}.`
          : 'No open goals right now — nothing earmarked.',
    },
    {
      key: 'flexible',
      amount: toAmount(flexibleWeight),
      weight: flexibleWeight,
      rationale: 'Day-to-day spending money that is not already committed.',
    },
  ]

  const emergencyAllocation = allocations[0].amount
  const monthsToFund =
    emergencyFullyFunded || emergencyAllocation <= EPS
      ? emergencyFullyFunded
        ? 0
        : null
      : Math.ceil(emergencyGap / emergencyAllocation)

  const budget: BudgetPlan = {
    monthlyIncome,
    totalExpenses,
    totalFixedExpenses,
    totalVariableExpenses,
    totalMinDebtPayments: totalMinMonthlyPayment,
    disposableIncome,
    debtCarveOut,
    debtShortfall,
    remainder,
    remainderShare,
    emergencyFund: {
      target: emergencyTarget,
      saved: emergencySaved,
      gap: emergencyGap,
      monthsCovered: round2(ratio(emergencySaved, totalExpenses) * 10) / 10,
      fundedRatio,
      fullyFunded: emergencyFullyFunded,
      monthlyAllocation: emergencyAllocation,
      monthsToFund,
      fundedMonth:
        monthsToFund === 0 ? startISO.slice(0, 7) : monthsToFund ? addMonths(startISO, monthsToFund) : null,
    },
    allocations,
    emergencyAllocation,
    goalsAllocation: allocations[1].amount,
    flexibleAllocation: allocations[2].amount,
  }

  /* ── 5. GOALS ─────────────────────────────────────────────────────── */
  // Goals are funded one after another (a queue) with the goals allocation, so
  // a later goal correctly waits for the earlier ones to finish.
  const goalQueue = [...d.goals].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'emergency_fund' ? -1 : 1
    return a.cost - a.saved < b.cost - b.saved ? -1 : 1
  })
  let carryMonths = 0
  const goals: GoalProjection[] = goalQueue.map((g) => {
    const remaining = round2(Math.max(0, g.cost - g.saved))
    const completed = remaining <= EPS
    // The emergency-fund goal is funded from the emergency allocation; every
    // other goal is funded from the goals allocation.
    const feed = g.type === 'emergency_fund' ? emergencyAllocation : budget.goalsAllocation
    const ownMonths = completed ? 0 : feed > EPS ? Math.ceil(remaining / feed) : null
    const monthsToFund = completed ? 0 : ownMonths === null ? null : carryMonths + ownMonths
    if (monthsToFund !== null) carryMonths = monthsToFund
    return {
      id: g.id,
      name: g.name,
      type: g.type,
      cost: g.cost,
      saved: g.saved,
      remaining,
      progress: round2(clamp(ratio(g.saved, g.cost), 0, 1) * 100) / 100,
      monthsToFund,
      fundedMonth: monthsToFund === null ? null : addMonths(startISO, monthsToFund),
      ownMonths,
      completed,
    }
  })

  /* ── 6. SPENDING PACE ─────────────────────────────────────────────── */
  // `logs` are real money actually spent. We compare the run-rate of the
  // current month against the flexible allowance so the user sees trouble early.
  const sortedLogs = [...d.logs].sort((a, b) => a.date.localeCompare(b.date))
  const totalLogged = round2(sortedLogs.reduce((s, l) => s + l.amount, 0))
  const lastEntryDate = sortedLogs.length ? sortedLogs[sortedLogs.length - 1].date : null
  const currentMonth = monthKeyOf(today)
  const currentMonthTotal = round2(
    sortedLogs.filter((l) => l.date.startsWith(currentMonth)).reduce((s, l) => s + l.amount, 0),
  )
  const windowStart = new Date(today.getTime() - 30 * 86_400_000)
  const windowTotal = sortedLogs
    .filter((l) => new Date(`${l.date}T00:00:00Z`).getTime() >= windowStart.getTime())
    .reduce((s, l) => s + l.amount, 0)
  const dailyAverage = round2(windowTotal / 30)
  const projectedMonthTotal = round2(dailyAverage * 30)
  const allowance = budget.flexibleAllocation
  const overUnder = round2(projectedMonthTotal - allowance)

  const spending: SpendingPace = {
    entries: sortedLogs.length,
    totalLogged,
    lastEntryDate,
    currentMonthTotal,
    currentMonth,
    dailyAverage,
    projectedMonthTotal,
    allowance,
    overUnder,
    onTrack: allowance <= EPS ? true : projectedMonthTotal <= allowance,
  }

  /* ── 7. FLAGS ─────────────────────────────────────────────────────── */
  // The warnings the brief calls out explicitly (debt load vs income, unusually
  // expensive rates) plus the ones the engine discovers along the way.
  const flags: Flag[] = []

  if (d.debts.length > 0 && monthlyIncome > 0) {
    if (dti > opts.dtiMax) {
      flags.push({
        code: 'dti_critical',
        severity: 'high',
        title: 'Debt payments are too large a share of income',
        message: `You pay ${fmtMoney(round2(totalMinMonthlyPayment), currency)} a month to debt — ${pct(dti)} of your income. Lenders and advisers treat anything above ${pct(opts.dtiMax)} as over-indebted.`,
        params: { dti, threshold: opts.dtiMax, amount: totalMinMonthlyPayment },
      })
    } else if (dti > opts.dtiWatch) {
      flags.push({
        code: 'dti_watch',
        severity: 'warn',
        title: 'Debt payments are stretching your income',
        message: `Debt takes ${pct(dti)} of your income, above the comfortable ${pct(opts.dtiWatch)} line and close to the ${pct(opts.dtiMax)} danger zone.`,
        params: { dti, threshold: opts.dtiWatch, amount: totalMinMonthlyPayment },
      })
    } else {
      flags.push({
        code: 'dti_ok',
        severity: 'good',
        title: 'Debt payments look affordable',
        message: `Debt takes ${pct(dti)} of your income, comfortably inside the ${pct(opts.dtiMax)} limit.`,
        params: { dti, amount: totalMinMonthlyPayment },
      })
    }
  }

  const expensive = items.filter((i) => i.interestRate >= opts.highInterestWarn)
  if (expensive.length > 0) {
    const worst = expensive.reduce((a, b) => (b.interestRate > a.interestRate ? b : a))
    flags.push({
      code: worst.interestRate >= opts.highInterestDanger ? 'interest_high' : 'interest_watch',
      severity: worst.interestRate >= opts.highInterestDanger ? 'high' : 'warn',
      title: 'Unusually high interest rate',
      message: `${worst.name} charges ${worst.interestRate}% a year — ${fmtMoney(worst.monthlyInterest, currency)} of interest every month, or ${fmtMoney(
        round2(expensive.reduce((s, x) => s + x.monthlyInterest, 0) * 12),
        currency,
      )} a year across your expensive debts.`,
      params: {
        rate: worst.interestRate,
        count: expensive.length,
        name: worst.name,
        threshold: opts.highInterestWarn,
      },
    })
  }

  if (debts.hasNegativeAmortization) {
    const bad = items.filter((i) => i.negativeAmortization).map((i) => i.name)
    flags.push({
      code: 'negative_amortization',
      severity: 'high',
      title: 'A minimum payment is not enough to reduce the balance',
      message: `${bad.join(', ')} charges more interest each month than your minimum payment covers. Paying the minimum means owing more over time.`,
      params: { names: bad.join(', ') },
    })
  }

  if (monthlyIncome <= 0) {
    flags.push({
      code: 'no_income',
      severity: 'warn',
      title: 'No income recorded',
      message: 'Add at least one income source so the planner can size your budget.',
    })
  } else if (disposableIncome < 0) {
    flags.push({
      code: 'overspending',
      severity: 'high',
      title: 'Living costs exceed income',
      message: `Your expenses are ${fmtMoney(round2(-disposableIncome), currency)} more than your income each month. This gap has to be closed before any plan can work.`,
      params: { gap: round2(-disposableIncome) },
    })
  } else if (disposableIncome > 0 && debtCarveOut > disposableIncome) {
    flags.push({
      code: 'debt_shortfall',
      severity: 'high',
      title: 'Debt payments do not fit in your budget',
      message: `You need ${fmtMoney(debtCarveOut, currency)} a month for debt but only ${fmtMoney(disposableIncome, currency)} is left after living costs — a shortfall of ${fmtMoney(debtShortfall, currency)}.`,
      params: { shortfall: debtShortfall },
    })
  }

  if (totalExpenses > 0 && !emergencyFullyFunded) {
    flags.push({
      code: 'emergency_gap',
      severity: fundedRatio < 0.5 ? 'warn' : 'info',
      title: 'Emergency fund is not fully funded',
      message: `You are ${fmtMoney(emergencyGap, currency)} short of a ${opts.emergencyMonths}-month buffer (${fmtMoney(emergencyTarget, currency)}). At ${fmtMoney(emergencyAllocation, currency)} a month you get there${
        budget.emergencyFund.fundedMonth ? ` by ${budget.emergencyFund.fundedMonth}` : ' once you free up some cash'
      }.`,
      params: { gap: emergencyGap, target: emergencyTarget, months: monthsToFund ?? 0 },
    })
  } else if (totalExpenses > 0 && emergencyFullyFunded) {
    flags.push({
      code: 'emergency_ok',
      severity: 'good',
      title: 'Emergency fund is fully funded',
      message: `Your buffer covers ${budget.emergencyFund.monthsCovered} months of living costs. Anything extra can go to goals or debt.`,
      params: { monthsCovered: budget.emergencyFund.monthsCovered },
    })
  }

  if (expenses.fixedShare > 0.7 && totalExpenses > 0) {
    flags.push({
      code: 'rigid_budget',
      severity: 'info',
      title: 'Most of your spending is fixed',
      message: `${pct(expenses.fixedShare)} of your expenses are committed (rent, contracts, school fees). That leaves little room to adjust a bad month.`,
      params: { share: expenses.fixedShare },
    })
  }

  if (allowance > 0 && !spending.onTrack && spending.entries > 0) {
    flags.push({
      code: 'spending_pace',
      severity: 'warn',
      title: 'Spending is running above the plan',
      message: `At ${fmtMoney(dailyAverage, currency)} a day you are heading for about ${fmtMoney(projectedMonthTotal, currency)} this month, ${fmtMoney(Math.abs(overUnder), currency)} over your ${fmtMoney(allowance, currency)} flexible allowance.`,
      params: { projected: projectedMonthTotal, allowance, over: overUnder },
    })
  }

  if (budget.emergencyFund.monthsCovered < 1 && totalExpenses > 0 && spending.entries > 0) {
    flags.push({
      code: 'no_buffer_months',
      severity: 'warn',
      title: 'Less than one month of expenses saved',
      message: 'A single unexpected bill would have to go on credit. Prioritise the emergency fund.',
    })
  }

  /* ── 8. HEALTH SCORE ──────────────────────────────────────────────── */
  // Start from a perfect score and deduct for each measured weakness. The
  // weights are deliberately blunt so the dial reacts to real problems only.
  let score = 100
  if (monthlyIncome > 0) {
    if (dti > opts.dtiMax) score -= 30
    else if (dti > opts.dtiWatch) score -= 14
    else score -= Math.round(dti * 10) // mild cost for any borrowing at all
    score -= Math.min(20, Math.round(expenses.incomeShare * 25))
  } else {
    score -= 50
  }
  if (debts.count > 0 && expensive.length > 0) score -= 10 + Math.min(10, expensive.length * 3)
  if (debts.hasNegativeAmortization) score -= 15
  if (disposableIncome < 0) score -= 20
  if (budget.debtShortfall > 0) score -= 10
  score -= Math.round((1 - fundedRatio) * 15)
  if (!spending.onTrack) score -= 5
  score = clamp(Math.round(score), 0, 100)

  const band: Analysis['health']['band'] =
    score >= 80 ? 'strong' : score >= 60 ? 'okay' : score >= 40 ? 'stretched' : 'at_risk'

  /* ── 9. RECOMMENDATIONS ───────────────────────────────────────────── */
  // Ordered "what to do next", built from the findings above.
  const recommendations: string[] = []
  if (monthlyIncome <= 0) {
    recommendations.push('Add your income sources — every other number depends on them.')
  }
  if (disposableIncome < 0) {
    recommendations.push(
      `Close the ${fmtMoney(round2(-disposableIncome), currency)} monthly gap: cut variable spending first, since fixed costs are harder to move.`,
    )
  }
  if (budget.debtShortfall > 0) {
    recommendations.push(
      'Talk to each lender before missing a payment — ask about rescheduling or a lower instalment. Missing payments is more expensive than renegotiating.',
    )
  }
  if (expensive.length > 0) {
    const worst = expensive.reduce((a, b) => (b.interestRate > a.interestRate ? b : a))
    recommendations.push(
      `Attack ${worst.name} first (${worst.interestRate}%). Clearing the most expensive debt first saves the most interest overall.`,
    )
  }
  if (debts.count > 0 && debts.plan.months !== null && debts.plan.months > 0) {
    recommendations.push(
      `At ${fmtMoney(debts.plan.monthlyPool, currency)} a month you are debt-free in ${debts.plan.months} months (${debts.plan.debtFreeMonth}), having paid ${fmtMoney(debts.plan.totalInterest, currency)} in interest.`,
    )
    if (
      debts.plan.alternate.totalInterest > debts.plan.totalInterest &&
      debts.plan.alternate.months !== null
    ) {
      recommendations.push(
        `Clearing the highest-rate debt first saves ${fmtMoney(
          round2(debts.plan.alternate.totalInterest - debts.plan.totalInterest),
          currency,
        )} versus clearing the smallest balance first.`,
      )
    }
  }
  if (!emergencyFullyFunded) {
    recommendations.push(
      `Keep the emergency fund allocation at ${fmtMoney(emergencyAllocation, currency)} a month until it reaches ${fmtMoney(emergencyTarget, currency)}.`,
    )
  } else if (openGoals.length > 0) {
    recommendations.push(
      `${fmtMoney(budget.goalsAllocation, currency)} a month now goes to goals instead of the buffer.`,
    )
  }
  if (openGoals.length > 0) {
    const next = goals.find((g) => !g.completed && g.type !== 'emergency_fund')
    if (next?.fundedMonth) {
      recommendations.push(`Next goal up: ${next.name}, funded by ${next.fundedMonth}.`)
    }
  }
  if (spending.entries === 0) {
    recommendations.push('Log your daily spending so the pace check has something to compare against.')
  } else if (!spending.onTrack) {
    recommendations.push(
      `Trim about ${fmtMoney(Math.max(1, round2(overUnder / 30)), currency)} a day from flexible spending to land inside the plan.`,
    )
  }

  return {
    generatedAt: today.toISOString(),
    currency,
    income,
    expenses,
    debts,
    budget,
    goals,
    spending,
    flags,
    recommendations,
    health: { score, band },
  }
}

/* ═══════════════════════════════════════════════════════════════════════ *
 *  6. Display helpers (shared by the Worker and the browser)
 * ═══════════════════════════════════════════════════════════════════════ */

/** Format money with the snapshot's currency. */
export function fmtMoney(amount: number, currency = 'USD'): string {
  const n = round2(num(amount))
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n)
  } catch {
    return `${n.toLocaleString('en-US')} ${currency}`
  }
}

/** Format a 0..1 ratio as a percentage string. */
export function pct(v: number, digits = 0): string {
  return `${(num(v) * 100).toFixed(digits)}%`
}
