/**
 * $honchoy — plain-language insights.
 *
 * Reads the engine's `Analysis` (never recalculates money itself) and turns it
 * into a short, warm, jargon-free summary: 2–3 sentences plus the handful of
 * numbers a first-time user needs. Pure function, so it runs in the browser,
 * in the Worker and in `scripts/test-education.mjs`.
 */
import type { Analysis } from '../types'

export interface Insight {
  /** Stable id so the UI / tests can refer to it. */
  code: string
  /** Higher = more important. Only the top three are shown. */
  priority: number
  tone: 'good' | 'care' | 'warn'
  text: string
  /** A lesson that helps with this insight (id from `lessons.ts`). */
  lesson?: string
}

export interface InsightSummary {
  income: number
  livingCosts: number
  loanPayments: number
  /** Income minus living costs and minimum loan payments. */
  leftOver: number
  /** Share of income going to living costs + loans (0..1+). */
  spentShare: number
  /** Planned monthly saving from the engine: emergency + goals allocation. */
  plannedSaving: number
  plannedSavingShare: number
  /** Money already put aside across all goals (incl. emergency fund). */
  totalSaved: number
  totalTarget: number
  emergency: { saved: number; target: number; ratio: number; fundedMonth: string | null }
  score: number
  band: Analysis['health']['band']
  /** A kind, one-line reading of the score. */
  scoreWords: string
  /** Up to three short "what is lowering your score" reasons, plain words. */
  scoreReasons: string[]
  insights: Insight[]
}

type Fmt = (n: number) => string

const pct = (v: number) => `${Math.round((Number.isFinite(v) ? v : 0) * 100)}%`

function monthWords(ym: string | null): string | null {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function monthsWords(n: number | null): string {
  if (n === null) return 'a long time'
  if (n <= 1) return 'about a month'
  if (n < 24) return `about ${n} months`
  return `about ${Math.round(n / 12)} years`
}

const SCORE_WORDS: Record<Analysis['health']['band'], string> = {
  strong: 'You are in a really good place. Keep doing what you are doing.',
  okay: 'A solid base — a few small steps will lift you higher.',
  stretched: 'Money is a bit stretched. Small, steady steps will help a lot.',
  at_risk: 'Things feel tight right now. Let’s start with one small change.',
}

/** Engine flag code -> the plain-words reason it lowers the score. */
const REASON_WORDS: Record<string, string> = {
  dti_critical: 'Loan payments take a big part of your income.',
  dti_watch: 'Loan payments are starting to take a lot of your income.',
  negative_amortization: 'One loan payment is too small to shrink the loan.',
  interest_watch: 'One of your loans is very expensive.',
  interest_high: 'One of your loans is very expensive.',
  overspending: 'Your costs are higher than your income.',
  debt_shortfall: 'There isn’t enough left to cover every loan payment.',
  emergency_gap: 'Your safety cushion for bad days isn’t full yet.',
  no_buffer_months: 'You have less than one month of costs saved.',
  spending_pace: 'Day-to-day spending is running above the plan.',
  rigid_budget: 'Most of your costs are fixed, so there is little room to adjust.',
  no_income: 'We don’t know your income yet.',
}

export function buildInsights(a: Analysis, money: Fmt): InsightSummary {
  const income = a.income.monthly
  const livingCosts = a.expenses.total
  const loanPayments = a.debts.totalMinMonthlyPayment
  const leftOver = income - livingCosts - loanPayments
  const spentShare = income > 0 ? (livingCosts + loanPayments) / income : 1
  const plannedSaving = Math.max(0, a.budget.emergencyAllocation + a.budget.goalsAllocation)
  const totalSaved = a.goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = a.goals.reduce((s, g) => s + g.cost, 0)
  const ef = a.budget.emergencyFund

  const insights: Insight[] = []

  /* 1 ── Money in vs money out ─────────────────────────────────────────── */
  if (income <= 0) {
    insights.push({
      code: 'no_income',
      priority: 100,
      tone: 'care',
      text: 'Add your income first — then we can show you how your money is really doing.',
      lesson: 'budget',
    })
  } else if (leftOver < 0) {
    insights.push({
      code: 'gap',
      priority: 98,
      tone: 'warn',
      text: `Right now your costs and loan payments are ${money(-leftOver)} more than you earn each month. Let’s find one cost to lower first — changeable costs like food or transport are usually the easiest.`,
      lesson: 'budget',
    })
  } else if (spentShare <= 0.6) {
    insights.push({
      code: 'room',
      priority: 60,
      tone: 'good',
      text: `Good news: your living costs and loan payments use ${pct(spentShare)} of your income, which leaves about ${money(leftOver)} each month for saving and spending.`,
    })
  } else {
    insights.push({
      code: 'tight',
      priority: 72,
      tone: 'care',
      text: `Your living costs and loan payments use ${pct(spentShare)} of your income, leaving about ${money(leftOver)} a month. Writing down daily spending for a week often shows small leaks you can fix.`,
      lesson: 'budget',
    })
  }

  /* 2 ── Goal progress ─────────────────────────────────────────────────── */
  const goal = a.goals.find((g) => !g.completed && g.type !== 'emergency_fund')
  if (goal) {
    const when = monthWords(goal.fundedMonth)
    const cushionFirst = !ef.fullyFunded && ef.target > 0
    let text = `You are ${pct(goal.progress)} of the way to your ${goal.name.toLowerCase()}.`
    if (when && goal.monthsToFund !== null) {
      text += cushionFirst
        ? ` If you follow the plan, you’ll have it by ${when} — after your safety cushion is built.`
        : ` If you follow the plan, you’ll have it by ${when} (${monthsWords(goal.monthsToFund)}).`
    } else {
      text += ' Once there is money left after costs, the plan will start putting some aside for it.'
    }
    insights.push({ code: 'goal', priority: 80, tone: 'good', text, lesson: 'saving' })
  } else if (a.goals.length > 0 && a.goals.every((g) => g.completed)) {
    insights.push({
      code: 'goals_done',
      priority: 55,
      tone: 'good',
      text: 'You have reached every goal you set — wonderful! Maybe it’s time to choose a new one.',
    })
  }

  /* 3 ── Debt ──────────────────────────────────────────────────────────── */
  const growing = a.debts.items.find((d) => d.negativeAmortization)
  const costly = [...a.debts.items].sort((x, y) => y.interestRate - x.interestRate)[0]
  if (growing) {
    insights.push({
      code: 'debt_growing',
      priority: 96,
      tone: 'warn',
      text: `The payment on ${growing.name} is smaller than the interest it adds each month, so the loan keeps growing. Paying even a little more, or talking to the lender, is the most important step.`,
      lesson: 'debt',
    })
  } else if (costly && costly.interestRate >= 25) {
    const yearly = (costly.amount * costly.interestRate) / 100
    insights.push({
      code: 'debt_costly',
      priority: 85,
      tone: 'care',
      text: `${costly.name} costs ${costly.interestRate}% a year — about ${money(yearly)} a year just in interest. Paying it off first will save you the most money.`,
      lesson: 'debt',
    })
  } else if (a.debts.count > 0 && a.debts.plan.debtFreeMonth) {
    insights.push({
      code: 'debt_ok',
      priority: 45,
      tone: 'good',
      text: `Keep making your loan payments and you’ll be free of debt by ${monthWords(a.debts.plan.debtFreeMonth)}.`,
      lesson: 'interest',
    })
  }

  /* 4 ── Safety cushion ────────────────────────────────────────────────── */
  if (!ef.fullyFunded && ef.target > 0 && income > 0) {
    insights.push({
      code: 'cushion',
      priority: ef.monthsCovered < 1 ? 78 : 50,
      tone: 'care',
      text: `Your safety cushion is ${pct(ef.fundedRatio)} full. Building it up means a surprise bill won’t push you into a new loan.`,
      lesson: 'emergency',
    })
  }

  /* 5 ── Spending pace ─────────────────────────────────────────────────── */
  if (a.spending.entries > 0 && !a.spending.onTrack && a.spending.overUnder > 0) {
    insights.push({
      code: 'pace',
      priority: 70,
      tone: 'care',
      text: `Your everyday spending is heading about ${money(a.spending.overUnder)} over the plan this month. Cutting around ${money(Math.max(1, a.spending.overUnder / 30))} a day would bring it back.`,
      lesson: 'budget',
    })
  }

  // Keep it short: at most three, most important first; never duplicate a lesson link.
  const top = insights.sort((x, y) => y.priority - x.priority).slice(0, 3)

  const scoreReasons = [
    ...new Set(
      a.flags
        .filter((f) => f.severity === 'high' || f.severity === 'warn')
        .map((f) => REASON_WORDS[f.code])
        .filter(Boolean),
    ),
  ].slice(0, 3)

  return {
    income,
    livingCosts,
    loanPayments,
    leftOver,
    spentShare,
    plannedSaving,
    plannedSavingShare: income > 0 ? plannedSaving / income : 0,
    totalSaved,
    totalTarget,
    emergency: { saved: ef.saved, target: ef.target, ratio: ef.fundedRatio, fundedMonth: ef.fundedMonth },
    score: a.health.score,
    band: a.health.band,
    scoreWords: SCORE_WORDS[a.health.band],
    scoreReasons,
    insights: top,
  }
}
