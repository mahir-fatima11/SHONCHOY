# $honchoy — Core Financial Engine

A pink and white budgeting app with expense tracking, a debt overview, and an automatic budget planner.

## Where the logic lives
**`src/engine.js` → `calculateFinancialPlan(data, options)`** is a pure function. It holds all the money math and has comments explaining each step.
- The worker imports it for `POST /api/plan`.
- The browser loads the same file from `GET /engine.js`, so there is one source of truth.
- The tunable thresholds are in the `RULES` object at the top of the file.

### Steps
1. **Income**: adds up all sources and converts to a monthly amount (monthly / weekly / daily / yearly).
2. **Expenses**: totals fixed and variable spending and groups it by category.
3. **Debts**:
   - Debt-to-income (DTI) flag at 30% (warning) and 40% (danger).
   - High-interest flag based on the debt type (bank 18%, MFI 27%, informal 24%, credit purchase 24%). Any rate of 36% or more is danger.
   - Payoff timeline worked out month by month, for both the minimum payment and a "what if" payment.
   - Warns if a payment never covers the interest.
4. **Disposable income** = income − expenses.
   - **Debt carve-out** = the minimum payments, plus 10% of the surplus as an extra payment on the highest-rate debt when any debt is flagged.
5. **Emergency fund**:
   - Target = 3 × (expenses + minimum debt payments).
   - If a goal with `type: "emergency"` exists, its `cost` is used as the target instead.
6. **Split of what's left** (emergency / goals / flexible):
   - 60/25/15 while the fund is under 50%.
   - 45/35/20 once it is over 50%.
   - 0/60/40 once it is fully funded.
   - The emergency share is capped at the amount still needed. Any overflow goes to goals and flexible spending.
   - The goals money is shared between goals according to how much each still needs.

## Endpoints
- `GET /`: the UI, with tabs for Plan, Income, Expenses, Debts and Goals.
- `GET /engine.js`: the engine as an ES module.
- `POST /api/plan?today=YYYY-MM-DD`: send the $honchoy data object, get the calculated plan back.

## Data
- Uses the shared `$honchoy` data shape: `{ app, user, income, expenses, debts, goals, logs }`.
- Debt types: `bank_loan | microloan | informal | credit_purchase`.
- For now, data is saved in the browser's localStorage. D1 could replace this later.

## Dev
`npm run build && pm2 start ecosystem.config.cjs` → http://localhost:3000
