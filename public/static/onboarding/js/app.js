/**
 * $honchoy — onboarding app shell
 * ------------------------------------------------------------------
 * Handles the parts every screen shares:
 *   - header with logo + language toggle
 *   - progress bar and "Step n of N"
 *   - Back / Continue navigation, gated by screen.isComplete(state)
 *   - URL hash routing (#age, #income, ...) so the browser back button works
 *   - <html lang> sync and re-rendering on language change
 *
 * Screens never touch each other or the shell. See screens/index.js.
 */
import { createStore } from './store.js';
import { t, LANGUAGE_META } from './i18n.js';
import { SCREENS } from './screens/index.js';
import { renderLanguageToggle, bindLanguageToggle } from './components/language-toggle.js';

const store = createStore();
const root = document.getElementById('app');

let index = 0;
let cleanups = [];
const entered = new Set();

/** First screen the user may visit: they can't skip ahead past an incomplete screen. */
function maxReachableIndex(state) {
  const firstIncomplete = SCREENS.findIndex((s) => !s.isComplete(state));
  return firstIncomplete === -1 ? SCREENS.length - 1 : firstIncomplete;
}

function indexFromHash() {
  const id = location.hash.replace('#', '');
  const i = SCREENS.findIndex((s) => s.id === id);
  return i === -1 ? 0 : i;
}

function go(i, { push = true } = {}) {
  index = Math.max(0, Math.min(i, maxReachableIndex(store.get())));
  const id = SCREENS[index].id;
  if (push && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  else if (!push) history.replaceState(null, '', `#${id}`);
  render({ focusHeading: true });
}

function render({ focusHeading = false } = {}) {
  cleanups.forEach((fn) => fn && fn());
  cleanups = [];

  const screen = SCREENS[index];
  if (!entered.has(screen.id)) {
    entered.add(screen.id);
    screen.onEnter?.(store);
  }

  const state = store.get();
  const lang = state.user.language;
  const total = SCREENS.length;
  const isLast = index === total - 1;
  const complete = screen.isComplete(state);

  document.documentElement.lang = LANGUAGE_META[lang].htmlLang;
  document.title = `${t(screen.titleKey, lang)} · $honchoy`;

  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#${SCREENS[0].id}" aria-label="$honchoy">
        <span class="brand__mark" aria-hidden="true">$</span>
        <span class="brand__text"><span class="brand__name">honchoy</span>
          <span class="brand__tag">${t('common.tagline', lang)}</span></span>
      </a>
      ${renderLanguageToggle(lang)}
    </header>

    <nav class="progress" aria-label="${t('common.step', lang, { n: index + 1, total })}">
      <div class="progress__meta">${t('common.step', lang, { n: index + 1, total })}</div>
      <div class="progress__track"><div class="progress__bar" style="width:${((index + 1) / total) * 100}%"></div></div>
    </nav>

    <main id="screen-root" class="card">${screen.render({ state, t, lang })}</main>

    ${isLast ? '' : `
    <footer class="actions">
      <button type="button" class="btn btn--ghost" data-nav="back" ${index === 0 ? 'hidden' : ''}>
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${t('common.back', lang)}
      </button>
      <div class="actions__primary">
        <p class="actions__hint" id="continue-hint" ${complete || !screen.hintKey ? 'hidden' : ''}>
          ${screen.hintKey ? t(screen.hintKey, lang) : ''}
        </p>
        <button type="button" class="btn btn--primary" data-nav="next"
                ${complete ? '' : 'disabled'} aria-describedby="continue-hint">
          ${t(index === total - 2 ? 'common.finish' : 'common.continue', lang)}
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </footer>`}
  `;

  const screenRoot = root.querySelector('#screen-root');
  cleanups.push(screen.mount?.(screenRoot, { store, t }));
  cleanups.push(bindLanguageToggle(root, store));

  // Move focus to the new heading so screen readers announce the step change.
  const heading = screenRoot.querySelector('h1');
  if (heading) {
    heading.tabIndex = -1;
    if (focusHeading) heading.focus({ preventScroll: true });
  }
}

/** Updates only the Continue button + hint (used while typing, to keep input focus). */
function refreshActions() {
  const screen = SCREENS[index];
  const complete = screen.isComplete(store.get());
  const next = root.querySelector('[data-nav="next"]');
  const hint = root.querySelector('#continue-hint');
  if (next) next.disabled = !complete;
  if (hint && screen.hintKey) hint.hidden = complete;
}

/* Store → UI */
store.subscribe((_state, meta = {}) => {
  if (meta.reset) { entered.clear(); return go(0); }
  if (meta.rerender || meta.languageChanged) return render();
  refreshActions();
});

/* Navigation */
root.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (!nav || nav.disabled) return;
  if (nav.dataset.nav === 'back') go(index - 1);
  if (nav.dataset.nav === 'next' && SCREENS[index].isComplete(store.get())) go(index + 1);
});

window.addEventListener('popstate', () => go(indexFromHash(), { push: false }));

/* Boot */
go(indexFromHash(), { push: false });

// Handy for debugging in DevTools: window.honchoy.store.get()
window.honchoy = { store, SCREENS };
