# $honchoy

A pink-and-white money planner with one job: turn income, expenses and debt into a single clear
monthly plan — what to pay, what to save, and what is safe to spend.

## Project Overview

- **Name**: $honchoy
- **Goal**: Give anyone with mixed debt (bank loans, microfinance, informal/family loans, shop
  credit) a realistic monthly plan, and warn them early when the arithmetic stops working.
- **Stack**: Hono + TypeScript on Cloudflare Pages, vanilla-DOM front end, no front-end framework.

### Currently completed features

**1. Expense tracking**
- Add, edit and delete expenses, each tagged `fixed` (committed every month) or `variable` (moves).
- Every expense has a category and an amount; categories are grouped and ranked by size.
- Computes the fixed/variable split, so you can see how much room you actually have to cut.
- Warns when more than 70% of spending is fixed ("little room to adjust").

**2. Debt overview**
- Add one or more debts with type — `bank_loan`, `microloan` (MFI), `informal` (family) or
  `credit_purchase` — plus amount owed, interest rate and minimum monthly payment.
- **Debt-load flag**: debt payments as a share of income are checked against **30% (watch)** and
  **40% (over-indebted)**. Both thresholds are editable.
- **High-interest flag**: any debt at or above **25% a year** is flagged, **40%+** is flagged hard.
- **Negative amortisation**: detects when a minimum payment does not even cover the month's
  interest, so the balance grows forever.
- Per-debt breakdown: monthly interest cost, how much of the minimum reaches principal, time to
  clear, and total interest paid.
- **Payoff timeline**: amortises each debt, then simulates clearing *all* of them with one monthly
  pool — `avalanche` (highest rate first) or `snowball` (smallest balance first), with a side-by-side
  comparison of which costs less interest. Reports the debt-free month.
- Grouped totals per lending channel (bank vs MFI vs family vs credit).

**3. Automatic budget planner** — one function, `computeFinancials()`
- `disposable income = income − living expenses`
- `debt carve-out  = minimum payments (+ any extra you choose)`
- `remainder       = disposable − carve-out`
- Splits the remainder between **emergency fund**, **goals** and **flexible spending**, weighted
  toward the emergency fund until it is fully funded, then dropping to a maintenance top-up.
- Emergency-fund target defaults to 3 months of living costs, or comes from a goal marked
  `emergency_fund`. Projects the month it will be fully funded.
- Goals are funded as a queue, so a later goal correctly waits for earlier ones.
- Spending-pace check compares logged spending against the flexible allowance and projects the month.
- Financial health score (0–100) with a band, plus ordered "what to do next" recommendations.

## Onboarding flow (`/onboarding`)

The first-run flow: **18+ confirmation → income setup → summary/JSON output**, with an **EN / বাং (Bangla)** toggle.
It is plain ES-module JavaScript with no build step, in `public/static/onboarding/`, served at `/onboarding`.

```
public/static/onboarding/
  style.css                          tokens (blush/rose/plum) and component classes
  js/app.js                          shell: header, progress, Back/Continue, hash routing
  js/store.js                        state + toExport() (the data contract), saved in localStorage
  js/i18n.js                         en/bn strings, t(), registerStrings(), Bangla-digit parsing
  js/components/language-toggle.js   EN / বাং toggle → user.language
  js/screens/                        age-screen, income-screen, summary-screen, index.js (screen order)
```

- **Age:** only the boolean `user.ageConfirmed` is stored. No date of birth or exact age is ever collected.
- **Income type:** the flow offers `monthly` | `yearly` | `irregular`. The engine accepts all three: `yearly` is treated as ÷12, and `irregular` is a typical month.
- **Language:** `user.language` is `en` | `bn`. `bn` is accepted by `normalizeData` and offered in the dashboard's language picker.

### Data output (contract)
`toExport(store.get())` returns exactly:
```json
[{
  "app": "$honchoy",
  "user":   { "ageConfirmed": true, "language": "en" },
  "income": { "type": "monthly", "sources": [{ "name": "salary", "amount": 20000 }] },
  "expenses": [{ "category": "rent", "name": "House rent", "amount": 6000, "type": "fixed" }],
  "debts":    [{ "type": "microloan", "amount": 5000, "interestRate": 20, "minMonthlyPayment": 500 }],
  "goals":    [{ "id": "g1", "name": "Sewing machine", "cost": 15000, "saved": 3000, "type": "custom" }],
  "logs":     [{ "date": "2026-09-25", "amount": 1000, "note": "" }]
}]
```
- `user.ageConfirmed` — boolean only. No date of birth or exact age is ever collected.
- `user.language` — `"en"` | `"bn"`.
- `income.type` — `"monthly"` | `"yearly"` | `"irregular"`.
- `income.sources[].name` — what the user typed; if blank, the category key (`salary`, `freelancing`, `business`, `scholarship`, `other`).
- `income.sources[].amount` — a number (Bangla digits like `২০,০০০` are parsed to `20000`). Rows with no valid amount are left out.
- `expenses`, `debts`, `goals`, `logs` start as `[]`; teammates' screens fill them.

State is saved in `localStorage` (`honchoy:onboarding:v1`), so a reload keeps progress.
Debug in DevTools with `honchoy.store.get()`.

### Adding an onboarding screen
1. Create `public/static/onboarding/js/screens/expenses-screen.js`:
```js
import { registerStrings } from '../i18n.js';
registerStrings({ en: { 'expenses.title': 'Your expenses' }, bn: { 'expenses.title': 'আপনার খরচ' } });

export default {
  id: 'expenses',                     // URL hash: #expenses
  titleKey: 'expenses.title',
  hintKey: 'expenses.required',       // optional: shown while Continue is disabled
  isComplete: (state) => state.expenses.length > 0,
  render: ({ state, t, lang }) => `<section class="screen"><h1 class="screen__title">${t('expenses.title', lang)}</h1>…</section>`,
  mount(root, { store }) {
    const onClick = () => store.update((s) => { s.expenses.push({ category: 'rent', name: 'House rent', amount: 6000, type: 'fixed' }); }, { rerender: true });
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);  // cleanup
  },
};
```
2. Import it in `public/static/onboarding/js/screens/index.js` and put it before `summaryScreen`.

Rules: write to the store only with `store.update()`. Pass `{ rerender: true }` for structural changes, but not on every keystroke (so inputs keep focus). Escape user text with `escapeHtml()`. Reuse the CSS classes `.field`, `.choice`, `.btn`, `.group` and the tokens `var(--rose-500)`, `var(--plum-900)`.


## URLs

- **Production**: _not yet deployed — see Deployment_
- **Local sandbox**: `http://localhost:3000` (PM2 + `wrangler pages dev`)
- **GitHub**: _not pushed yet_

## Functional entry URIs

| Method | Path | Params | Purpose |
| --- | --- | --- | --- |
| GET | `/` | — | The app shell; all views are client-rendered |
| GET | `/onboarding` | — | Onboarding flow: 18+ → income → summary (`#age`, `#income`, `#summary`) |
| GET | `/api/health` | — | Liveness probe |
| GET | `/api/meta` | — | Defaults, categories, debt types, sample snapshot |
| POST | `/api/calculate` | body `{ data?, options?, now? }` | Runs the engine, returns the full analysis. Empty body uses the sample |
| POST | `/api/validate` | body `{ data }` | Normalises a snapshot and reports what was dropped |
| GET | `/static/*` | — | `app.js`, `style.css`, `favicon.svg` |

Client routes: `#/dashboard`, `#/expenses`, `#/debts`, `#/budget`, `#/goals`, `#/log`, `#/data`.

### `POST /api/calculate` example

```bash
curl -s -X POST http://localhost:3000/api/calculate \
  -H 'Content-Type: application/json' -d '{}'
```

Omit `data` to analyse the built-in sample. Pass your own snapshot in the shape below.

## Data Architecture

- **Storage**: browser `localStorage` under `honchoy.v1.data` / `honchoy.v1.options`. There is no
  login and no server-side store — the plan never leaves the device (see *Known limitations*).
- **Portability**: export/import JSON, plus a `?d=<json>` share link that loads a plan read-only.
- **Data models**: `HonchoyData` (input) → `Analysis` (output), defined in `src/types.ts`.

```json
{
  "app": "$honchoy",
  "user": { "ageConfirmed": true, "language": "en", "currency": "USD" },
  "income": { "type": "monthly", "sources": [{ "name": "salary", "amount": 20000 }] },
  "expenses": [
    { "category": "rent", "name": "House rent", "amount": 6000, "type": "fixed" },
    { "category": "food", "name": "Groceries", "amount": 3000, "type": "variable" }
  ],
  "debts": [
    { "type": "microloan", "amount": 5000, "interestRate": 20, "minMonthlyPayment": 500 }
  ],
  "goals": [
    { "id": "g1", "name": "Sewing machine", "cost": 15000, "saved": 3000, "type": "custom" }
  ],
  "logs": [{ "date": "2026-09-25", "amount": 1000, "note": "" }]
}
```

`income.type` may be `monthly`, `weekly`, `biweekly` or `annual`; every source is normalised to a
monthly figure. `data.user.currency` (added for formatting) is optional — older snapshots still load.

### Where the maths lives

**All calculation logic is in one function: `computeFinancials()` in `src/engine.ts`.**

It is pure — no clock reads (the date is injected via `now`), no I/O, no globals — so the identical
code runs in the Worker *and* in the browser, and the two can never disagree. The dollar amounts the
UI shows are produced by the same function that answers the API. Everything above it is small private
helpers; everything below is display formatting.

## User Guide

1. Open the app — it starts with sample data so you can see how it works.
2. **Expenses** — add your costs, tagging each fixed or variable.
3. **Debts** — add each loan: type, amount owed, rate, minimum payment. Read the warnings and the
   payoff timeline; use the slider to test what an extra payment per month would do.
4. **Budget** — the plan is already built. Adjust the emergency-fund target and the 30/40 debt
   thresholds to match your own situation.
5. **Goals** — add what you are saving for; mark one as your emergency fund to drive the buffer.
6. **Spending log** — add entries as you spend; the pace check tells you if the month is running hot.
7. **Data** — download a JSON backup, or copy a share link.

## Deployment

- **Platform**: Cloudflare Pages (`wrangler pages deploy dist`)
- **Status**: built and verified locally; **not yet deployed**
- **Suggested project name**: `honchoy`
- **Last updated**: 2026-09-25

### Local development

```bash
npm run build          # bundle the client, then build the Worker
npm test               # 112 engine assertions
npm run test:render    # 66 render assertions against the built bundle
npm run verify         # build + both suites
pm2 start ecosystem.config.cjs   # http://localhost:3000
```

### Notes

- `public/static/app.js` is **generated** by `scripts/build-client.mjs`; never edit it by hand.
- Do not add a `src/*.js` file next to a `.ts` file of the same name — Vite resolves `.js` first and
  will silently shadow the TypeScript module.
- No bindings required: no D1, KV or R2, so the deploy needs no configuration.

## Known limitations / not yet implemented

- **Data is device-local.** There is no account system and no server-side store, so a plan does not
  follow the user between devices. Adding sync means a Cloudflare D1 table plus some form of login.
- **No authentication**, so no multi-user support.
- `user.language` (`en` / `mn`) is stored but the UI is English-only; no translations exist yet.
- Nothing is verified against real loan contracts — rates and balances are user-supplied estimates.
- The engine uses flat monthly amortisation. It does not model variable rates, fees, penalties,
  grace periods or irregular income.
- No PDF/CSV export, reminders, recurring transactions, or category budgeting (envelopes).

## Recommended next steps

1. Deploy to Cloudflare Pages and record the production URL above.
2. Add D1 + login so plans sync across devices.
3. Add CSV/PDF export and recurring expense templates.
4. Add i18n for `mn` (the data shape already carries a language field).
5. Extend the engine to model fees and variable rates, with tests for each new rule.
