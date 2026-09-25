/**
 * $honchoy — central data store
 * ------------------------------------------------------------------
 * ONE source of truth for all onboarding data. Every screen reads from
 * and writes to this store; nothing else keeps its own copy of the data.
 *
 * Internal state vs. exported data
 * --------------------------------
 * The internal state is almost the same as the export shape, with two
 * UI-only extras on each income source:
 *   - `id`       stable key used to render/remove rows
 *   - `category` salary | freelancing | business | scholarship | other
 * `toExport()` removes both, so the output matches the agreed contract
 * exactly (see EXPORT SHAPE below). If the user leaves a source name
 * blank, the category key is exported as the name (e.g. "salary").
 *
 * EXPORT SHAPE (contract shared with teammates — do not change keys):
 * [{
 *   app: "$honchoy",
 *   user:    { ageConfirmed: boolean, language: "en" | "bn" },
 *   income:  { type: "monthly" | "yearly" | "irregular",
 *              sources: [{ name: string, amount: number }] },
 *   expenses:[{ category, name, amount, type: "fixed" | "variable" }],
 *   debts:   [{ type, amount, interestRate, minMonthlyPayment }],
 *   goals:   [{ id, name, cost, saved, type }],
 *   logs:    [{ date: "YYYY-MM-DD", amount, note }]
 * }]
 *
 * Privacy: only the boolean `ageConfirmed` is stored. Nobody asks for
 * or saves a date of birth or exact age.
 */

const STORAGE_KEY = 'honchoy:onboarding:v1';

export const APP_NAME = '$honchoy';
export const LANGUAGES = /** @type {const} */ (['en', 'bn']);
export const INCOME_TYPES = /** @type {const} */ (['monthly', 'yearly', 'irregular']);
export const INCOME_CATEGORIES = /** @type {const} */ ([
  'salary',
  'freelancing',
  'business',
  'scholarship',
  'other',
]);

/** A fresh, empty state. Arrays owned by other teammates start empty. */
export function createInitialState() {
  return {
    app: APP_NAME,
    user: {
      ageConfirmed: false,
      language: 'en',
    },
    income: {
      type: 'monthly',
      /** @type {{id:string, category:string, name:string, amount:number|null}[]} */
      sources: [],
    },
    expenses: [], // ← teammate: expenses screen
    debts: [],    // ← teammate: debts screen
    goals: [],    // ← teammate: goals screen
    logs: [],     // ← teammate: savings log screen
  };
}

/** Short unique id for list rows (UI only, never exported). */
export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Creates a new, empty income source row. */
export function createIncomeSource(category = 'salary') {
  return { id: uid('inc'), category, name: '', amount: null };
}

/** True if an income source can be exported. */
export function isValidIncomeSource(src) {
  return typeof src.amount === 'number' && Number.isFinite(src.amount) && src.amount > 0;
}

/**
 * Converts internal state into the agreed export shape.
 * Always returns an ARRAY holding exactly one object, as the contract requires.
 */
export function toExport(state) {
  return [
    {
      app: APP_NAME,
      user: {
        ageConfirmed: state.user.ageConfirmed === true,
        language: state.user.language,
      },
      income: {
        type: state.income.type,
        sources: state.income.sources.filter(isValidIncomeSource).map((s) => ({
          name: s.name.trim() || s.category,
          amount: s.amount,
        })),
      },
      expenses: state.expenses,
      debts: state.debts,
      goals: state.goals,
      logs: state.logs,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Persistence (localStorage keeps drafts across page reloads)         */
/* ------------------------------------------------------------------ */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Merge over defaults so newly added keys are always present.
    const base = createInitialState();
    return {
      ...base,
      ...saved,
      user: { ...base.user, ...saved.user },
      income: { ...base.income, ...saved.income },
    };
  } catch {
    return null;
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or disabled: app still works in memory */
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

/**
 * Tiny observable store.
 *   store.get()                 → current state (treat as read-only)
 *   store.update(draft => {...}) → mutate a copy; saves + notifies listeners
 *   store.subscribe(fn)         → fn(state, meta) on each update; returns unsubscribe
 *   store.reset()               → back to initial state
 *
 * `meta` is an optional tag passed to update(). The shell uses it to decide
 * whether to re-render (e.g. typing in an input should NOT re-render and lose focus).
 */
export function createStore() {
  let state = load() ?? createInitialState();
  const listeners = new Set();

  const notify = (meta) => listeners.forEach((fn) => fn(state, meta));

  return {
    get: () => state,
    update(mutator, meta = {}) {
      const draft = structuredClone(state);
      mutator(draft);
      state = draft;
      save(state);
      notify(meta);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset() {
      state = createInitialState();
      save(state);
      notify({ reset: true });
    },
  };
}
