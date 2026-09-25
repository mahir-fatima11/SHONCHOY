import { Hono } from 'hono'
import { calculateFinancialPlan } from './engine.js'
// Single source of truth: the same engine file is also shipped to the browser.
// @ts-ignore - Vite raw import
import engineSource from './engine.js?raw'

const app = new Hono()

// Serve the engine to the browser as an ES module (no duplicated logic).
app.get('/engine.js', (c) =>
  c.body(engineSource, 200, { 'Content-Type': 'application/javascript; charset=utf-8' })
)

// Server-side calculation endpoint (same function the UI uses).
// Body: the $honchoy data object. Optional query ?today=YYYY-MM-DD
app.post('/api/plan', async (c) => {
  let data: any
  try { data = await c.req.json() } catch { return c.json({ error: 'Invalid JSON body' }, 400) }
  const today = c.req.query('today') || undefined
  return c.json(calculateFinancialPlan(data, { today }))
})

app.get('/', (c) => c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>$honchoy — My Money</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: {
      brand: { 50:'#fff1f6',100:'#ffe4ee',200:'#fecadd',300:'#fda4c4',400:'#fb6fa2',500:'#f43f84',600:'#e11d6b',700:'#be1257',800:'#9d1249',900:'#831440' }
    }, fontFamily: { sans: ['Poppins','ui-sans-serif','system-ui'] } } } }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="/static/style.css" rel="stylesheet" />
</head>
<body class="bg-brand-50 text-gray-800 font-sans min-h-screen">
  <header id="app-header" class="bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow">
    <div class="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">$honchoy</h1>
        <p class="text-brand-100 text-sm">Your money plan, made simple</p>
      </div>
      <div class="flex gap-2">
        <button id="load-sample-btn" class="btn-ghost"><i class="fas fa-wand-magic-sparkles mr-1"></i>Sample</button>
        <button id="reset-btn" class="btn-ghost"><i class="fas fa-rotate-left mr-1"></i>Reset</button>
      </div>
    </div>
    <nav id="tab-nav" class="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
      <button class="tab active" data-tab="plan"><i class="fas fa-chart-pie mr-1"></i>Plan</button>
      <button class="tab" data-tab="income"><i class="fas fa-wallet mr-1"></i>Income</button>
      <button class="tab" data-tab="expenses"><i class="fas fa-receipt mr-1"></i>Expenses</button>
      <button class="tab" data-tab="debts"><i class="fas fa-hand-holding-dollar mr-1"></i>Debts</button>
      <button class="tab" data-tab="goals"><i class="fas fa-bullseye mr-1"></i>Goals</button>
    </nav>
  </header>

  <main id="app-main" class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <section id="flags-section"></section>
    <section id="tab-plan" class="tab-panel"></section>
    <section id="tab-income" class="tab-panel hidden"></section>
    <section id="tab-expenses" class="tab-panel hidden"></section>
    <section id="tab-debts" class="tab-panel hidden"></section>
    <section id="tab-goals" class="tab-panel hidden"></section>
  </main>

  <footer class="text-center text-xs text-brand-400 pb-8">Data is saved on this device only.</footer>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`))

export default app
