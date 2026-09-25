/**
 * Tests for the insights & education module — plain Node, no framework.
 * Run with `npm run test:education`.
 */
import { computeFinancials, fmtMoney } from '../src/engine.ts'
import { SAMPLE_DATA } from '../src/sample.ts'
import { buildInsights } from '../src/education/insights.ts'
import { lessons, fillAmounts } from '../src/education/lessons.ts'
import { redFlags, checkAnswers, checkText } from '../src/education/scams.ts'

let passed = 0
let failed = 0
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ✓ ${name}`) } else { failed++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}
const money = (n) => fmtMoney(n, 'USD')
const run = (data) => buildInsights(computeFinancials({ data, now: '2026-09-25T00:00:00Z' }), money)

console.log('\nInsights — sample data')
{
  const s = run(SAMPLE_DATA)
  check('2–3 insights', s.insights.length >= 2 && s.insights.length <= 3, String(s.insights.length))
  check('score matches engine', s.score === computeFinancials({ data: SAMPLE_DATA, now: '2026-09-25T00:00:00Z' }).health.score)
  check('left over = income − costs − loans', s.leftOver === 20000 - 11500 - 1450, String(s.leftOver))
  check('mentions the sewing machine', s.insights.some((i) => /sewing machine/.test(i.text)))
  check('mentions the 34% shop credit', s.insights.some((i) => /34%/.test(i.text)))
  check('no jargon (DTI / amortization / APR)', s.insights.every((i) => !/\b(DTI|amorti[sz]ation|APR)\b/i.test(i.text)))
  check('every insight lesson exists', s.insights.every((i) => !i.lesson || lessons.some((l) => l.id === i.lesson)))
  check('score reasons are plain words', s.scoreReasons.length > 0 && s.scoreReasons.every((r) => r.length < 90))
}

console.log('\nInsights — the original brief shape')
{
  const brief = {
    app: '$honchoy', user: { ageConfirmed: true, language: 'en' },
    income: { type: 'monthly', sources: [{ name: 'salary', amount: 20000 }] },
    expenses: [
      { category: 'rent', name: 'House rent', amount: 6000, type: 'fixed' },
      { category: 'food', name: 'Groceries', amount: 3000, type: 'variable' },
    ],
    debts: [{ type: 'microloan', amount: 5000, interestRate: 20, minMonthlyPayment: 500 }],
    goals: [{ id: 'g1', name: 'Sewing machine', cost: 15000, saved: 3000, type: 'custom' }],
    logs: [{ date: '2026-09-25', amount: 1000, note: '' }],
  }
  const s = run(brief)
  check('works without ids / currency', s.insights.length >= 2)
  check('leftover 10,500', s.leftOver === 10500, String(s.leftOver))
  check('good-news room insight', s.insights.some((i) => i.code === 'room'))
}

console.log('\nInsights — edge cases')
{
  const broke = { ...SAMPLE_DATA, income: { type: 'monthly', sources: [{ name: 'job', amount: 8000 }] } }
  const s = run(broke)
  check('costs > income → gap insight first', s.insights[0].code === 'gap', s.insights[0]?.code)
  const none = { ...SAMPLE_DATA, income: { type: 'monthly', sources: [] } }
  check('no income → asks for income', run(none).insights[0].code === 'no_income')
  const growing = { ...SAMPLE_DATA, debts: [{ id: 'x', type: 'informal', name: 'Loan from uncle', amount: 10000, interestRate: 60, minMonthlyPayment: 100 }] }
  check('payment below interest → growing-loan warning', run(growing).insights.some((i) => i.code === 'debt_growing'))
  const empty = { ...SAMPLE_DATA, debts: [], goals: [], logs: [], expenses: [] }
  const e = run(empty)
  check('empty data does not crash', Array.isArray(e.insights) && e.insights.every((i) => !/NaN|undefined/.test(i.text)))
}

console.log('\nLessons')
check('6–8 lessons', lessons.length >= 6 && lessons.length <= 8, String(lessons.length))
for (const topic of ['saving', 'investing', 'inflation', 'interest', 'debt', 'diversification']) {
  check(`covers ${topic}`, lessons.some((l) => l.topic.toLowerCase() === topic))
}
check('unique ids', new Set(lessons.map((l) => l.id)).size === lessons.length)
check('amounts are formatted', fillAmounts('costs {1500}', money) === 'costs $1,500')
check('no raw amount tokens left', lessons.every((l) => !/\{\d/.test(fillAmounts([l.example, l.tryThis, ...l.body].join(' '), money))))

console.log('\nScam checker')
for (const id of ['guaranteed', 'pressure', 'upfront', 'unregistered']) {
  check(`has the "${id}" red flag`, redFlags.some((f) => f.id === id))
}
check('no answers → low', checkAnswers([]).level === 'low')
check('one pressure answer → medium', checkAnswers(['pressure']).level === 'medium')
check('guaranteed + upfront → high', checkAnswers(['guaranteed', 'upfront']).level === 'high')
check('unknown ids ignored', checkAnswers(['nope']).matched.length === 0)
const scam = checkText('Guaranteed 50% profit every month! Only today, pay a small registration fee to my personal number. Share the OTP.')
check('obvious scam text → high', scam.level === 'high')
check('finds 5 red flags in scam text', scam.matched.length === 5, scam.matched.map((m) => m.id).join(','))
const normal = checkText('Hi, your monthly bank statement for September is ready. Visit your branch if you have questions.')
check('ordinary message → low', normal.level === 'low', normal.matched.map((m) => m.id).join(','))

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
