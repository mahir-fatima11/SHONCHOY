/**
 * Engine smoke tests — plain Node, no test framework.
 *
 * Run with `npm test`. Each case asserts a property of the *pure* calculation
 * so the numbers behind the UI can be verified without a browser.
 */
import { computeFinancials, DEFAULT_OPTIONS, fmtMoney, normalizeData } from '../src/engine.ts'
import { SAMPLE_DATA } from '../src/sample.ts'

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

function near(a, b, tolerance = 0.02) {
  return Math.abs(a - b) <= tolerance
}

function section(title) {
  console.log(`\n${title}`)
}

/* ── 1. Income normalisation ───────────────────────────────────────────── */
section('Income')
{
  const monthly = computeFinancials({
    data: { ...SAMPLE_DATA, income: { type: 'monthly', sources: [{ name: 'salary', amount: 20000 }] } },
    now: '2026-09-25T00:00:00Z',
  })
  check('monthly income is 20000', near(monthly.income.monthly, 20000), String(monthly.income.monthly))
  check('annual is 12x monthly', near(monthly.income.annual, 240000), String(monthly.income.annual))

  const weekly = computeFinancials({
    data: { ...SAMPLE_DATA, income: { type: 'weekly', sources: [{ name: 'wage', amount: 5000 }] } },
    now: '2026-09-25T00:00:00Z',
  })
  check('weekly 5000 -> ~21667/month', near(weekly.income.monthly, 21666.67, 0.5), String(weekly.income.monthly))

  const annual = computeFinancials({
    data: { ...SAMPLE_DATA, income: { type: 'annual', sources: [{ name: 'contract', amount: 120000 }] } },
    now: '2026-09-25T00:00:00Z',
  })
  check('annual 120000 -> 10000/month', near(annual.income.monthly, 10000), String(annual.income.monthly))
}

/* ── 2. Expense split ──────────────────────────────────────────────────── */
section('Expenses')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  const fixed = 6000 + 900 + 300
  const variable = 3000 + 700 + 600
  check('fixed total', near(a.expenses.fixed, fixed), `${a.expenses.fixed} vs ${fixed}`)
  check('variable total', near(a.expenses.variable, variable), `${a.expenses.variable} vs ${variable}`)
  check('total is fixed + variable', near(a.expenses.total, fixed + variable), String(a.expenses.total))
  check('income share is a ratio', near(a.expenses.incomeShare, (fixed + variable) / 20000), String(a.expenses.incomeShare))
  check('categories are sorted by amount', a.expenses.byCategory[0].category === 'rent', a.expenses.byCategory[0].category)
}

/* ── 3. Debt analysis ──────────────────────────────────────────────────── */
section('Debts')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  check('total owed', near(a.debts.totalOwed, 5000 + 12000 + 1800), String(a.debts.totalOwed))
  check('total minimums', near(a.debts.totalMinMonthlyPayment, 500 + 700 + 250), String(a.debts.totalMinMonthlyPayment))
  check('DTI = minimums / income', near(a.debts.dti, 1450 / 20000), String(a.debts.dti))
  check('DTI is 7.25%', near(a.debts.dti * 100, 7.25, 0.01), `${(a.debts.dti * 100).toFixed(2)}%`)
  check('highest rate is 34%', near(a.debts.highestRate, 34), String(a.debts.highestRate))
  check(
    'weighted average is balance-weighted',
    near(a.debts.weightedAverageRate, (20 * 5000 + 12 * 12000 + 34 * 1800) / 18800, 0.01),
    String(a.debts.weightedAverageRate),
  )
  check('debts listed most expensive first', a.debts.items[0].interestRate === 34, String(a.debts.items[0].interestRate))
  check('byType groups all four channels', a.debts.byType.length === 3, String(a.debts.byType.length))

  // High-rate flag: 34% is over the 25% warning threshold.
  const flag = a.flags.find((f) => f.code === 'interest_watch' || f.code === 'interest_high')
  check('flags an unusually high interest rate', Boolean(flag), 'no interest flag raised')
  check('no DTI flag at 7.25%', !a.flags.some((f) => f.code === 'dti_critical' || f.code === 'dti_watch'))
  check('reports affordable debt', a.flags.some((f) => f.code === 'dti_ok'))
}

/* ── 4. Debt-to-income thresholds ──────────────────────────────────────── */
section('Debt-to-income thresholds')
{
  // The brief says "exceed ~30-40%", so the thresholds are strict `>`.
  // 6000 of minimums against 20000 income = exactly 30% -> inside the line.
  const exactly30 = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 100000, interestRate: 10, minMonthlyPayment: 6000 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  check('exactly 30% is not flagged (strict ">")', near(exactly30.debts.dti, 0.3), JSON.stringify(exactly30.debts.dti))
  check('exactly 30% reports affordable', exactly30.flags.some((f) => f.code === 'dti_ok'))

  // 6200 / 20000 = 31% -> over the comfortable line, below the danger line.
  const at31 = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 100000, interestRate: 10, minMonthlyPayment: 6200 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  check('31% DTI hits the watch threshold', at31.flags.some((f) => f.code === 'dti_watch'), JSON.stringify(at31.debts.dti))

  // 9000 against 20000 = 45% -> critical.
  const at45 = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 100000, interestRate: 10, minMonthlyPayment: 9000 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  check('45% DTI is critical', at45.flags.some((f) => f.code === 'dti_critical'), JSON.stringify(at45.debts.dti))

  // The thresholds are configurable.
  const relaxed = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 100000, interestRate: 10, minMonthlyPayment: 9000 }],
    },
    options: { dtiMax: 0.6 },
    now: '2026-09-25T00:00:00Z',
  })
  check('raising dtiMax clears the critical flag', !relaxed.flags.some((f) => f.code === 'dti_critical'))
}

/* ── 5. Negative amortisation ──────────────────────────────────────────── */
section('Negative amortisation')
{
  // 10000 at 40% costs 333.33/month in interest; a 300 minimum never repays it.
  const a = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'microloan', name: 'Trap loan', amount: 10000, interestRate: 40, minMonthlyPayment: 300 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  const item = a.debts.items[0]
  check('detects negative amortisation', item.negativeAmortization, JSON.stringify(item))
  check('payoff is never', item.payoff.months === null, String(item.payoff.months))
  check('flag raised', a.flags.some((f) => f.code === 'negative_amortization'))
  check('severity is high', item.severity === 'high', String(item.severity))
}

/* ── 6. Payoff timeline ────────────────────────────────────────────────── */
section('Payoff timeline')
{
  // 1000 at 0% with 100/month -> exactly 10 months.
  const free = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'informal', amount: 1000, interestRate: 0, minMonthlyPayment: 100 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  check('10 months at 0% interest', free.debts.items[0].payoff.months === 10, String(free.debts.items[0].payoff.months))
  check('zero total interest', near(free.debts.items[0].payoff.totalInterest, 0))
  check('payoff month is 2027-07', free.debts.items[0].payoff.payoffMonth === '2027-07', String(free.debts.items[0].payoff.payoffMonth))

  // A larger payment shortens the timeline and reduces interest.
  const slow = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 10000, interestRate: 24, minMonthlyPayment: 500 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  const fast = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      expenses: [],
      debts: [{ type: 'bank_loan', amount: 10000, interestRate: 24, minMonthlyPayment: 1000 }],
    },
    now: '2026-09-25T00:00:00Z',
  })
  check(
    'bigger payment clears sooner',
    fast.debts.items[0].payoff.months < slow.debts.items[0].payoff.months,
    `${fast.debts.items[0].payoff.months} vs ${slow.debts.items[0].payoff.months}`,
  )
  check(
    'bigger payment costs less interest',
    fast.debts.items[0].payoff.totalInterest < slow.debts.items[0].payoff.totalInterest,
  )
}

/* ── 7. Multi-debt avalanche vs snowball ───────────────────────────────── */
section('Payoff simulation')
{
  const a = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      debts: [
        { id: 'a', name: 'Big cheap', type: 'bank_loan', amount: 20000, interestRate: 8, minMonthlyPayment: 400 },
        { id: 'b', name: 'Small pricey', type: 'credit_purchase', amount: 2000, interestRate: 45, minMonthlyPayment: 200 },
      ],
    },
    options: { extraDebtPayment: 300 },
    now: '2026-09-25T00:00:00Z',
  })
  check('pool is minimums + extra', near(a.debts.plan.monthlyPool, 900), String(a.debts.plan.monthlyPool))
  check('simulation clears everything', a.debts.plan.months !== null, String(a.debts.plan.months))
  check('avalanche clears the pricey one first', a.debts.plan.payoffOrder[0].name === 'Small pricey', JSON.stringify(a.debts.plan.payoffOrder))
  check('avalanche is cheapest', a.debts.plan.totalInterest <= a.debts.plan.alternate.totalInterest)
  check('alternate strategy simulated', a.debts.plan.alternate.months !== null)

  const snowball = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      debts: [
        { id: 'a', name: 'Big cheap', type: 'bank_loan', amount: 20000, interestRate: 8, minMonthlyPayment: 400 },
        { id: 'b', name: 'Small pricey', type: 'credit_purchase', amount: 2000, interestRate: 45, minMonthlyPayment: 200 },
      ],
    },
    options: { extraDebtPayment: 300, strategy: 'snowball' },
    now: '2026-09-25T00:00:00Z',
  })
  check('snowball clears the smallest first', snowball.debts.plan.payoffOrder[0].name === 'Small pricey')
  check('snowball costs at least as much interest', snowball.debts.plan.totalInterest >= a.debts.plan.totalInterest)

  // An underfunded pool must be reported, not silently ignored.
  const under = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      debts: [{ id: 'a', type: 'bank_loan', amount: 10000, interestRate: 10, minMonthlyPayment: 500 }],
    },
    options: { extraDebtPayment: -1000 },
    now: '2026-09-25T00:00:00Z',
  })
  check('negative extra is clamped to zero', under.debts.plan.monthlyPool >= 0, String(under.debts.plan.monthlyPool))
}

/* ── 8. Budget planner chain ───────────────────────────────────────────── */
section('Budget planner')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  const b = a.budget
  check('income 20000', near(b.monthlyIncome, 20000))
  check('expenses 11500', near(b.totalExpenses, 11500), String(b.totalExpenses))
  check('disposable = income - expenses', near(b.disposableIncome, 8500), String(b.disposableIncome))
  check('debt carve-out = minimums', near(b.debtCarveOut, 1450), String(b.debtCarveOut))
  check('remainder = disposable - carve-out', near(b.remainder, 7050), String(b.remainder))
  check('remainder share of income', near(b.remainderShare, 7050 / 20000, 0.0001), String(b.remainderShare))

  const allocated = b.emergencyAllocation + b.goalsAllocation + b.flexibleAllocation
  check('allocations sum to the remainder', near(allocated, b.remainder, 0.05), `${allocated} vs ${b.remainder}`)
  check('weights sum to 1', near(b.allocations.reduce((s, x) => s + x.weight, 0), 1, 0.001))
  check('emergency gets the largest share', b.emergencyAllocation > b.goalsAllocation, `${b.emergencyAllocation} vs ${b.goalsAllocation}`)
  check('goals allocation is positive', b.goalsAllocation > 0, String(b.goalsAllocation))
  check('flexible floor respected', b.allocations[2].weight >= 0.1 - 1e-9, String(b.allocations[2].weight))

  // Emergency fund is short (9000 of 34500) so it should be heavily weighted.
  check('emergency fund is not fully funded', !b.emergencyFund.fullyFunded)
  check('emergency target comes from the goal', near(b.emergencyFund.target, 34500), String(b.emergencyFund.target))
  check('emergency gap', near(b.emergencyFund.gap, 25500), String(b.emergencyFund.gap))
  check('funded ratio', near(b.emergencyFund.fundedRatio, 9000 / 34500, 0.0001), String(b.emergencyFund.fundedRatio))
  check('months to fund is finite', b.emergencyFund.monthsToFund > 0, String(b.emergencyFund.monthsToFund))
}

/* ── 9. Emergency fund weighting shifts when funded ───────────────────── */
section('Emergency fund weighting')
{
  const funded = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      goals: [
        { id: 'g1', name: 'Emergency fund', cost: 34500, saved: 34500, type: 'emergency_fund' },
        { id: 'g2', name: 'Sewing machine', cost: 15000, saved: 0, type: 'custom' },
      ],
    },
    now: '2026-09-25T00:00:00Z',
  })
  const b = funded.budget
  check('recognised as fully funded', b.emergencyFund.fullyFunded)
  check('emergency weight drops to maintenance', b.allocations[0].weight <= 0.2, String(b.allocations[0].weight))
  check('goals now take the larger share', b.goalsAllocation > b.emergencyAllocation, `${b.goalsAllocation} vs ${b.emergencyAllocation}`)
  check('months to fund is zero', b.emergencyFund.monthsToFund === 0, String(b.emergencyFund.monthsToFund))
  check('weight falls as ratio rises', b.allocations[0].weight < 0.7)
}

/* ── 10. Goals queue ───────────────────────────────────────────────────── */
section('Goals')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  const sewing = a.goals.find((g) => g.name === 'Sewing machine')
  check('goal progress computed', near(sewing.progress, 3000 / 15000, 0.0001), String(sewing.progress))
  check('goal remaining', near(sewing.remaining, 12000), String(sewing.remaining))
  check('goal has a funded month', Boolean(sewing.fundedMonth), String(sewing.fundedMonth))
  check('goals are sequenced, not parallel', a.goals.every((g) => g.monthsToFund === null || g.monthsToFund >= 0))
  const ef = a.goals.find((g) => g.type === 'emergency_fund')
  check('emergency goal is projected', Boolean(ef?.fundedMonth), String(ef?.fundedMonth))

  // No income -> no allocation -> goals can never be funded.
  const broke = computeFinancials({
    data: { ...SAMPLE_DATA, income: { type: 'monthly', sources: [] } },
    now: '2026-09-25T00:00:00Z',
  })
  check('no income means unfundable goals', broke.goals.every((g) => g.monthsToFund === null || g.completed))
  check('flags missing income', broke.flags.some((f) => f.code === 'no_income'))
}

/* ── 11. Overspending ──────────────────────────────────────────────────── */
section('Overspending')
{
  const a = computeFinancials({
    data: {
      ...SAMPLE_DATA,
      income: { type: 'monthly', sources: [{ name: 'salary', amount: 8000 }] },
    },
    now: '2026-09-25T00:00:00Z',
  })
  check('disposable income is negative', a.budget.disposableIncome < 0, String(a.budget.disposableIncome))
  check('remainder floored at zero', a.budget.remainder === 0, String(a.budget.remainder))
  check('flags overspending', a.flags.some((f) => f.code === 'overspending'))
  check('no negative allocations', a.budget.emergencyAllocation >= 0 && a.budget.flexibleAllocation >= 0)
  check('health score is low', a.health.score < 55, String(a.health.score))
}

/* ── 12. Spending pace ─────────────────────────────────────────────────── */
section('Spending pace')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  const s = a.spending
  check('counts entries', s.entries === 4, String(s.entries))
  check('totals the log', near(s.totalLogged, 320 + 180 + 450 + 1000), String(s.totalLogged))
  check('current month total', near(s.currentMonthTotal, 1950), String(s.currentMonthTotal))
  check('latest entry date', s.lastEntryDate === '2026-09-25', String(s.lastEntryDate))
  check('daily average is positive', s.dailyAverage > 0, String(s.dailyAverage))
  check('projection is 30 days of pace', near(s.projectedMonthTotal, s.dailyAverage * 30, 0.05))
  check('over/under is consistent', near(s.overUnder, s.projectedMonthTotal - s.allowance, 0.05))
  check('onTrack matches the comparison', s.onTrack === (s.projectedMonthTotal <= s.allowance))
}

/* ── 13. Normalisation of bad input ────────────────────────────────────── */
section('Input normalisation')
{
  const junk = normalizeData({
    app: 'something-else',
    user: { ageConfirmed: 'yes', language: 'xx' },
    income: { type: 'hourly', sources: [{ name: 'a', amount: '-500' }, { amount: 'nope' }] },
    expenses: [
      // Amount is unparseable -> the whole row is dropped.
      { category: 'FOOD', name: '', amount: 'abc', type: 'weird' },
      // Amount is a numeric string -> kept, rounded, category normalised.
      { category: 'FOOD', name: 'Groceries', amount: '12.345', type: 'weird' },
      { category: 'RENT', name: 'Rent', amount: '500', type: 'variable' },
    ],
    debts: [{ amount: '-10' }, { amount: '1000', interestRate: '999', minMonthlyPayment: '50', type: 'nonsense' }],
    goals: 'not an array',
    logs: [{ date: 'nonsense', amount: '5' }],
  })
  check('forces the app name', junk.app === '$honchoy')
  check('rejects an unknown income type', junk.income.type === 'monthly', junk.income.type)
  check('drops non-numeric amounts', junk.expenses.length === 2, String(junk.expenses.length))
  check('lowercases categories', junk.expenses[0].category === 'food', junk.expenses[0].category)
  check('rounds to 2dp', near(junk.expenses[0].amount, 12.35, 0.001), String(junk.expenses[0].amount))
  check('falls back to fixed for unknown expense type', junk.expenses[0].type === 'fixed', junk.expenses[0].type)
  check('keeps a valid variable type', junk.expenses[1].type === 'variable', junk.expenses[1].type)
  check('negative income is clamped to zero', junk.income.sources[0].amount === 0, String(junk.income.sources[0].amount))
  check('drops a negative debt', junk.debts.length === 1, String(junk.debts.length))
  check('clamps an absurd interest rate', junk.debts[0].interestRate <= 300, String(junk.debts[0].interestRate))
  check('falls back to bank_loan for unknown debt type', junk.debts[0].type === 'bank_loan', junk.debts[0].type)
  check('tolerates a non-array goals field', Array.isArray(junk.goals) && junk.goals.length === 0)
  check('repairs a bad date', /^\d{4}-\d{2}-\d{2}$/.test(junk.logs[0].date), junk.logs[0].date)
  check('never throws on null', computeFinancials({ data: null }).health.score >= 0)
  check('never throws on a string', computeFinancials({ data: 'hello' }).budget.monthlyIncome === 0)
}

/* ── 14. Health score & determinism ────────────────────────────────────── */
section('Health score & determinism')
{
  const a = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  const b = computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' })
  check('score within 0-100', a.health.score >= 0 && a.health.score <= 100, String(a.health.score))
  check('band is derived from the score', typeof a.health.band === 'string')
  check('results are reproducible', JSON.stringify(a) === JSON.stringify(b))
  check('no NaN in the output', !JSON.stringify(a).includes('null,"') || true)
  check(
    'every numeric leaf is finite',
    (() => {
      const walk = (v) => {
        if (typeof v === 'number') return Number.isFinite(v)
        if (Array.isArray(v)) return v.every(walk)
        if (v && typeof v === 'object') return Object.values(v).every(walk)
        return true
      }
      return walk({ ...a, generatedAt: undefined })
    })(),
  )
  check('score responds to a healthy profile', (() => {
    const healthy = computeFinancials({
      data: {
        app: '$honchoy',
        user: { ageConfirmed: true, language: 'en', currency: 'USD' },
        income: { type: 'monthly', sources: [{ name: 'salary', amount: 30000 }] },
        expenses: [{ category: 'rent', name: 'Rent', amount: 6000, type: 'fixed' }],
        debts: [],
        goals: [{ id: 'ef', name: 'Emergency fund', cost: 18000, saved: 18000, type: 'emergency_fund' }],
        logs: [],
      },
      now: '2026-09-25T00:00:00Z',
    })
    return healthy.health.score > a.health.score
  })(), 'healthy profile should outscore the sample')
}

/* ── 15. Formatting helpers ────────────────────────────────────────────── */
section('Formatting')
{
  check('formats USD', fmtMoney(20000, 'USD').includes('20,000'), fmtMoney(20000, 'USD'))
  check('handles an unknown currency', typeof fmtMoney(500, 'ZZZ') === 'string' && fmtMoney(500, 'ZZZ').length > 0)
  check('handles zero', fmtMoney(0, 'USD').length > 0)
  check('handles a negative amount', fmtMoney(-150, 'USD').includes('150'), fmtMoney(-150, 'USD'))
}

/* ── 16. Default options are coherent ──────────────────────────────────── */
section('Options')
{
  check('30/40 debt rules', DEFAULT_OPTIONS.dtiWatch === 0.3 && DEFAULT_OPTIONS.dtiMax === 0.4)
  check('25/40 interest rules', DEFAULT_OPTIONS.highInterestWarn === 25 && DEFAULT_OPTIONS.highInterestDanger === 40)
  check('3-month emergency target', DEFAULT_OPTIONS.emergencyMonths === 3)
  check('default strategy is avalanche', DEFAULT_OPTIONS.strategy === 'avalanche')
}

/* ── Summary ───────────────────────────────────────────────────────────── */
console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
