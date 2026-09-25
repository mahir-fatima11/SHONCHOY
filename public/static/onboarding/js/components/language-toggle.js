/**
 * <LanguageToggle> — EN / বাং segmented switch
 * ------------------------------------------------------------------
 * Plain function component: returns an HTML string, and bindLanguageToggle()
 * connects click handlers. It writes to store.user.language only. The app
 * shell handles the rest: it re-renders the screen and updates <html lang>.
 *
 * Accessibility: a radiogroup of two buttons (aria-checked), so screen
 * readers announce "English, selected". Each option's label is written in its
 * own language so users can find their language whatever is currently selected.
 */
import { LANGUAGES } from '../store.js';
import { LANGUAGE_META, t } from '../i18n.js';

export function renderLanguageToggle(lang) {
  const options = LANGUAGES.map((code) => {
    const meta = LANGUAGE_META[code];
    const active = code === lang;
    return `
      <button type="button"
        class="lang-toggle__option${active ? ' is-active' : ''}"
        role="radio" aria-checked="${active}"
        lang="${meta.htmlLang}"
        data-lang="${code}"
        title="${meta.label}">
        ${meta.short}
      </button>`;
  }).join('');

  return `
    <div class="lang-toggle" role="radiogroup" aria-label="${t('common.language', lang)}">
      ${options}
      <span class="lang-toggle__thumb" data-pos="${LANGUAGES.indexOf(lang)}" aria-hidden="true"></span>
    </div>`;
}

/** Connects the toggle inside `root` to the store. Returns a cleanup function. */
export function bindLanguageToggle(root, store) {
  const el = root.querySelector('.lang-toggle');
  if (!el) return () => {};

  const onClick = (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    const next = btn.dataset.lang;
    if (next === store.get().user.language) return;
    store.update((s) => { s.user.language = next; }, { languageChanged: true });
  };

  // Arrow keys move between options (standard radiogroup behaviour).
  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const cur = LANGUAGES.indexOf(store.get().user.language);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = LANGUAGES[(cur + dir + LANGUAGES.length) % LANGUAGES.length];
    store.update((s) => { s.user.language = next; }, { languageChanged: true });
    requestAnimationFrame(() => document.querySelector(`.lang-toggle [data-lang="${next}"]`)?.focus());
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKey);
  return () => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKey);
  };
}
