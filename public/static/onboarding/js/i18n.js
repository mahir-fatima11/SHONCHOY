/**
 * $honchoy — Bangla / English language support
 * ------------------------------------------------------------------
 * Data structure
 *   state.user.language : "en" | "bn"   (stored in the store and exported)
 *
 *   STRINGS = {
 *     en: { "key": "English text", ... },
 *     bn: { "key": "বাংলা লেখা", ... }
 *   }
 *   Keys are namespaced by screen: "common.*", "age.*", "income.*", ...
 *
 * Adding strings for YOUR screen (teammates):
 *   import { registerStrings } from '../i18n.js';
 *   registerStrings({
 *     en: { 'expenses.title': 'Your expenses' },
 *     bn: { 'expenses.title': 'আপনার খরচ' },
 *   });
 *
 * Using them:
 *   t('expenses.title', lang)              → string
 *   t('common.step', lang, { n: 1, total: 3 }) → "{n}" placeholders filled in
 *
 * If a key is missing in Bangla, the English text is shown; if missing in
 * both, the key itself is shown, so gaps are easy to spot.
 */

export const LANGUAGE_META = {
  en: { code: 'en', short: 'EN', label: 'English', htmlLang: 'en', locale: 'en-IN' },
  bn: { code: 'bn', short: 'বাং', label: 'বাংলা', htmlLang: 'bn', locale: 'bn-BD' },
};

const STRINGS = {
  en: {
    'common.tagline': 'Savings, made simple',
    'common.language': 'Language',
    'common.back': 'Back',
    'common.continue': 'Continue',
    'common.finish': 'Finish',
    'common.step': 'Step {n} of {total}',
    'common.currency': '৳',
  },
  bn: {
    'common.tagline': 'সঞ্চয়, সহজভাবে',
    'common.language': 'ভাষা',
    'common.back': 'পিছনে',
    'common.continue': 'এগিয়ে যান',
    'common.finish': 'শেষ করুন',
    'common.step': 'ধাপ {n} / {total}',
    'common.currency': '৳',
  },
};

/** Merge a screen's strings into the global dictionary. */
export function registerStrings(dict) {
  for (const lang of Object.keys(dict)) {
    STRINGS[lang] = { ...(STRINGS[lang] || {}), ...dict[lang] };
  }
}

/** Translate `key` into `lang`, filling `{placeholders}` from `vars`. */
export function t(key, lang = 'en', vars = {}) {
  const text = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? formatValue(vars[name], lang) : `{${name}}`,
  );
}

function formatValue(v, lang) {
  return typeof v === 'number' ? formatNumber(v, lang) : String(v);
}

/** Formats a number for display. Uses Bangla digits (০-৯) in Bangla. */
export function formatNumber(n, lang = 'en') {
  const locale = LANGUAGE_META[lang]?.locale ?? 'en-IN';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
}

/** Formats a taka amount, e.g. "৳20,000" / "৳২০,০০০". */
export function formatMoney(n, lang = 'en') {
  return `৳${formatNumber(n, lang)}`;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Turns user input into a number. Accepts Bangla or Latin digits and ignores
 * commas and spaces. Returns null for empty or invalid input.
 *   parseAmount("২০,০০০") → 20000
 */
export function parseAmount(input) {
  if (input == null) return null;
  const latin = String(input)
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[,\s৳]/g, '');
  if (latin === '') return null;
  const n = Number(latin);
  return Number.isFinite(n) ? n : null;
}

/** Escapes user-entered text before placing it into innerHTML templates. */
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
