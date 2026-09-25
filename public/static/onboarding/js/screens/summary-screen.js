/**
 * Screen 3 — Summary / data output
 * ------------------------------------------------------------------
 * Shows the exported payload (store.toExport) so the team can confirm the
 * contract. Teammates' screens go BEFORE this one in screens/index.js.
 * Later this can become a proper "review" screen that POSTs the payload.
 */
import { toExport } from '../store.js';
import { registerStrings, formatMoney, escapeHtml } from '../i18n.js';

registerStrings({
  en: {
    'summary.title': 'You’re all set',
    'summary.lead': 'Here is what we saved. This data follows the shared $honchoy format.',
    'summary.age': 'Age confirmed (18+)',
    'summary.language': 'Language',
    'summary.incomeType': 'Income type',
    'summary.sources': 'Income sources',
    'summary.json': 'Data output (JSON)',
    'summary.copy': 'Copy JSON',
    'summary.copied': 'Copied!',
    'summary.download': 'Download',
    'summary.restart': 'Start over',
    'summary.yes': 'Yes',
  },
  bn: {
    'summary.title': 'সব ঠিক আছে',
    'summary.lead': 'আমরা যা সংরক্ষণ করেছি তা নিচে দেওয়া হলো। এই ডেটা $honchoy-এর নির্ধারিত ফরম্যাট অনুসরণ করে।',
    'summary.age': 'বয়স নিশ্চিত (১৮+)',
    'summary.language': 'ভাষা',
    'summary.incomeType': 'আয়ের ধরন',
    'summary.sources': 'আয়ের উৎস',
    'summary.json': 'ডেটা আউটপুট (JSON)',
    'summary.copy': 'JSON কপি করুন',
    'summary.copied': 'কপি হয়েছে!',
    'summary.download': 'ডাউনলোড',
    'summary.restart': 'আবার শুরু করুন',
    'summary.yes': 'হ্যাঁ',
  },
});

export default {
  id: 'summary',
  titleKey: 'summary.title',
  isComplete: () => true,

  render({ state, t, lang }) {
    const [data] = toExport(state);
    const json = JSON.stringify(toExport(state), null, 2);
    const sources = data.income.sources
      .map((s) => `<li><span>${escapeHtml(s.name)}</span><strong>${formatMoney(s.amount, lang)}</strong></li>`)
      .join('');

    return `
      <section class="screen" aria-labelledby="summary-title">
        <div class="screen__icon" aria-hidden="true"><i class="fa-solid fa-circle-check"></i></div>
        <h1 id="summary-title" class="screen__title">${t('summary.title', lang)}</h1>
        <p class="screen__lead">${t('summary.lead', lang)}</p>

        <dl class="summary">
          <div><dt>${t('summary.age', lang)}</dt><dd>${data.user.ageConfirmed ? t('summary.yes', lang) : '—'}</dd></div>
          <div><dt>${t('summary.language', lang)}</dt><dd>${lang === 'bn' ? 'বাংলা' : 'English'}</dd></div>
          <div><dt>${t('summary.incomeType', lang)}</dt><dd>${t(`income.type.${data.income.type}`, lang)}</dd></div>
        </dl>

        <h2 class="group__label">${t('summary.sources', lang)}</h2>
        <ul class="summary-list">${sources}</ul>

        <details class="json" open>
          <summary>${t('summary.json', lang)}</summary>
          <pre id="json-output" tabindex="0">${escapeHtml(json)}</pre>
          <div class="json__actions">
            <button type="button" class="btn btn--ghost" data-action="copy">
              <i class="fa-regular fa-copy" aria-hidden="true"></i> <span>${t('summary.copy', lang)}</span>
            </button>
            <button type="button" class="btn btn--ghost" data-action="download">
              <i class="fa-solid fa-download" aria-hidden="true"></i> ${t('summary.download', lang)}
            </button>
            <button type="button" class="btn btn--link" data-action="restart">${t('summary.restart', lang)}</button>
          </div>
        </details>
      </section>`;
  },

  mount(root, { store, t }) {
    const onClick = async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const json = JSON.stringify(toExport(store.get()), null, 2);

      if (btn.dataset.action === 'copy') {
        try {
          await navigator.clipboard.writeText(json);
          btn.querySelector('span').textContent = t('summary.copied', store.get().user.language);
        } catch { /* clipboard blocked; users can still select the text */ }
      }
      if (btn.dataset.action === 'download') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: 'honchoy-onboarding.json' });
        a.click();
        URL.revokeObjectURL(url);
      }
      if (btn.dataset.action === 'restart') {
        store.reset();
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
