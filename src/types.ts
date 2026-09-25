/**
 * $honchoy — shared data contracts.
 *
 * Everything that crosses the engine / API / browser boundary is described here.
 * The engine never imports anything but these types, which is what lets the same
 * calculation run in the Cloudflare Worker *and* in the browser.
 */

/* ------------------------------------------------------------------ *
 * Input shape
 * ------------------------------------------------------------------ */

/** How the `income.sources` amounts are expressed. */
/**
 * `yearly` is an alias of `annual`; `irregular` amounts are entered as a typical
 * month (the onboarding flow asks "typical amount per month"), so they count as monthly.
 */
export type IncomeType = 'monthly' | 'weekly' | 'biweekly' | 'annual' | 'yearly' | 'irregular'

/** Fixed = committed every month (rent). Variable = it moves (groceries, transport). */
export type ExpenseType = 'fixed' | 'variable'

/** The four borrowing channels the app tracks. */
export type DebtType = 'bank_loan' | 'microloan' | 'informal' | 'credit_purchase'

/** `emergency_fund` goals are treated specially by the budget planner. */
export type GoalType = 'custom' | 'emergency_fund'

export interface IncomeSource {
  name: string
  amount: number
}

export interface Income {
  type: IncomeType
  sources: IncomeSource[]
}

export interface Expense {
  /** Optional — assigned by the app when the item is created. */
  id?: string
  category: string
  name: string
  amount: number
  type: ExpenseType
}

export interface Debt {
  /** Optional — assigned by the app when the item is created. */
  id?: string
  /** Optional display label. Falls back to a label derived from `type`. */
  name?: string
  type: DebtType
  /** Outstanding balance right now. */
  amount: number
  /** Annual interest rate, as a percentage (20 means 20% APR). */
  interestRate: number
  /** Contractual minimum payment for one month. */
  minMonthlyPayment: number
}

export interface Goal {
  id: string
  name: string
  cost: number
  saved: number
  type: GoalType
}

export interface LogEntry {
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  amount: number
  note?: string
}

/** The full $honchoy snapshot. This is what gets stored and exported. */
export interface HonchoyData {
  app: '$honchoy'
  user: {
    ageConfirmed: boolean
    /** BCP-47-ish language tag: `en` (English) or `bn` (Bangla). `mn` is still accepted for older snapshots. */
    language: string
    /** ISO-4217 code used for formatting. Optional so older snapshots still load. */
    currency?: string
  }
  income: Income
  expenses: Expense[]
  debts: Debt[]
  goals: Goal[]
  logs: LogEntry[]
}

/* ------------------------------------------------------------------ *
 * Output shape
 * ------------------------------------------------------------------ */

export type Severity = 'high' | 'warn' | 'info' | 'good'

/**
 * A finding produced by the engine. `code` is machine readable so the UI can
 * localise the message; `title` / `message` are the English fallback.
 */
export interface Flag {
  code: string
  severity: Severity
  title: string
  message: string
  params?: Record<string, string | number>
}

/** Amortisation result for a single debt paid with a flat monthly payment. */
export interface PayoffEstimate {
  /** Months to clear the balance, or `null` when the payment can never clear it. */
  months: number | null
  /** `YYYY-MM` the balance reaches zero (null when `months` is null). */
  payoffMonth: string | null
  totalInterest: number
  totalPaid: number
  /** Monthly payment that produced this estimate. */
  paymentUsed: number
  /** True when the payment does not even cover the monthly interest. */
  negativeAmortization: boolean
}

/** One row of the debt overview table. */
export interface DebtBreakdown {
  id: string
  name: string
  type: DebtType
  amount: number
  interestRate: number
  minMonthlyPayment: number
  /** Interest charged in the first month at the current rate. */
  monthlyInterest: number
  /** Share of the balance that the minimum payment actually repays per month. */
  principalShare: number
  /** Estimated months to clear at the *minimum* payment. */
  monthsAtMinimum: number | null
  /** True when `minMonthlyPayment` does not cover `monthlyInterest`. */
  negativeAmortization: boolean
  /** Estimated at the user's chosen payment (defaults to the minimum). */
  payoff: PayoffEstimate
  /** Annual rate as a share of the balance, for sorting. */
  effectiveMonthlyCost: number
  severity: Severity | null
  /** English explanation of the severity, if any. */
  note: string | null
}

export interface DebtPlan {
  /** Total pool fed to the plan every month. */
  monthlyPool: number
  /** True when the pool cannot cover every minimum payment. */
  underfunded: boolean
  /** Months until every debt is cleared (null = never / not simulated). */
  months: number | null
  totalInterest: number
  totalPaid: number
  debtFreeMonth: string | null
  /** Which strategy the simulation used — clears the most expensive debt first. */
  strategy: 'avalanche' | 'snowball'
  /** Order in which debts are cleared. */
  payoffOrder: { id: string; name: string; month: number }[]
  /** The alternative strategy, for comparison. */
  alternate: {
    strategy: 'avalanche' | 'snowball'
    months: number | null
    totalInterest: number
  }
}

export interface DebtAnalysis {
  count: number
  totalOwed: number
  totalMinMonthlyPayment: number
  /** Weighted average APR across all balances. */
  weightedAverageRate: number
  /** Highest single APR. */
  highestRate: number
  /** Interest billed across every debt in one month at current rates. */
  monthlyInterestCost: number
  /** Debt payments as a share of monthly income (1 = 100%). */
  dti: number
  byType: {
    type: DebtType
    count: number
    amount: number
    minMonthlyPayment: number
    averageRate: number
  }[]
  items: DebtBreakdown[]
  plan: DebtPlan
  /** True when at least one debt's minimum payment cannot stop the balance growing. */
  hasNegativeAmortization: boolean
}

export interface BudgetAllocation {
  key: 'emergency' | 'goals' | 'flexible'
  amount: number
  /** Share of the remainder, 0..1. */
  weight: number
  /** Human readable reason for the weight. */
  rationale: string
}

export interface BudgetPlan {
  monthlyIncome: number
  totalExpenses: number
  totalFixedExpenses: number
  totalVariableExpenses: number
  totalMinDebtPayments: number
  /** Income minus living expenses, before any debt payment. */
  disposableIncome: number
  /** Money set aside for debt this month (minimums + any extra the user chose). */
  debtCarveOut: number
  /** Minimums that the disposable income cannot cover. */
  debtShortfall: number
  /** What is left to divide between savings, goals and spending. */
  remainder: number
  /** The remainder as a share of income. */
  remainderShare: number
  emergencyFund: {
    target: number
    saved: number
    gap: number
    /** Months of expenses covered by the current balance. */
    monthsCovered: number
    fundedRatio: number
    fullyFunded: boolean
    monthlyAllocation: number
    /** Months until the target is reached at the current allocation (null = never). */
    monthsToFund: number | null
    fundedMonth: string | null
  }
  allocations: BudgetAllocation[]
  /** Convenience accessors for the three buckets. */
  emergencyAllocation: number
  goalsAllocation: number
  flexibleAllocation: number
}

export interface GoalProjection {
  id: string
  name: string
  type: GoalType
  cost: number
  saved: number
  remaining: number
  progress: number
  /** Months until this goal is funded, counting the queue ahead of it. */
  monthsToFund: number | null
  /** Month this goal completes. */
  fundedMonth: string | null
  /** Months of saving attributable to this goal alone. */
  ownMonths: number | null
  completed: boolean
}

export interface SpendingPace {
  entries: number
  totalLogged: number
  lastEntryDate: string | null
  /** Total logged in the calendar month of the most recent entry. */
  currentMonthTotal: number
  currentMonth: string | null
  /** Average logged per day across the tracked window (trailing 30 days). */
  dailyAverage: number
  /** Where the month lands if the current pace holds. */
  projectedMonthTotal: number
  /** The flexible allowance for a month. */
  allowance: number
  /** Projected total minus the allowance (positive = over). */
  overUnder: number
  onTrack: boolean
}

export interface IncomeAnalysis {
  type: IncomeType
  monthly: number
  annual: number
  sources: { name: string; amount: number; monthlyAmount: number; share: number }[]
}

export interface ExpenseAnalysis {
  count: number
  total: number
  fixed: number
  variable: number
  fixedShare: number
  variableShare: number
  /** Total as a share of monthly income. */
  incomeShare: number
  byCategory: {
    category: string
    amount: number
    count: number
    share: number
    type: ExpenseType
  }[]
}

export interface Analysis {
  generatedAt: string
  currency: string
  income: IncomeAnalysis
  expenses: ExpenseAnalysis
  debts: DebtAnalysis
  budget: BudgetPlan
  goals: GoalProjection[]
  spending: SpendingPace
  flags: Flag[]
  recommendations: string[]
  health: {
    score: number
    band: 'strong' | 'okay' | 'stretched' | 'at_risk'
  }
}
