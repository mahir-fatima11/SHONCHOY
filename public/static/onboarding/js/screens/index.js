/**
 * Screen registry — the onboarding order
 * ------------------------------------------------------------------
 * TO ADD YOUR SCREEN (teammates):
 *   1. Create screens/<name>-screen.js that default-exports a Screen object
 *      (see the contract below; age-screen.js is the simplest example).
 *   2. Import it here and put it in SCREENS before `summary`.
 *   That's it. The shell handles progress, Back/Continue, the language
 *   toggle and saving.
 *
 * Screen contract:
 * {
 *   id:          string                        unique, used in the URL hash (#income)
 *   titleKey:    string                        i18n key, used for document.title
 *   hintKey?:    string                        i18n key shown when Continue is blocked
 *   isComplete:  (state) => boolean            enables the Continue button
 *   onEnter?:    (store) => void               optional; runs once before first render
 *   render:      ({ state, t, lang }) => html  returns an HTML string (escape user text!)
 *   mount?:      (root, { store, t }) => cleanup   attach listeners; return a cleanup fn
 * }
 *
 * Writing to state: store.update(draft => { draft.expenses.push({...}) })
 *   - pass { rerender: true } as the 2nd arg for structural changes
 *   - leave it out while the user types, so inputs keep focus
 */
import ageScreen from './age-screen.js';
import incomeScreen from './income-screen.js';
import summaryScreen from './summary-screen.js';
// import expensesScreen from './expenses-screen.js';   // ← teammate
// import debtsScreen from './debts-screen.js';         // ← teammate
// import goalsScreen from './goals-screen.js';         // ← teammate

export const SCREENS = [
  ageScreen,
  incomeScreen,
  // expensesScreen,
  // debtsScreen,
  // goalsScreen,
  summaryScreen,
];
