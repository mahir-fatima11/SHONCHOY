/**
 * Screen 2 — Income setup
 * ------------------------------------------------------------------
 * Writes:
 *   state.income.type    : "monthly" | "yearly" | "irregular"
 *   state.income.sources : [{ id, category, name, amount }]
 *                          (id and category are UI-only; see store.toExport)
 *
 * Re-rendering rule: typing in a name or amount calls store.update WITHOUT
 * { rerender: true }, so the input keeps focus. Only structural changes
 * (add/remove row, change type) re-render the screen. The total and the
 * row error messages are updated directly in the DOM.
 */
import { INCOME_TYPES, INCOME_CATEGORIES, createIncomeSource, isValidIncomeSource } from '../store.js';
import { registerStrings, formatMoney, parseAmount, escapeHtml } from '../i18n.js';

registerStrings({
  en: {
    'income.title': 'Your income',
    'income.lead': 'Add every source of money you receive. You can change this later.',
    'income.typeLabel': 'How do you usually get paid?',
    'income.type.monthly': 'Monthly',
    'income.type.monthly.hint': 'Same time every month',
    'income.type.yearly': 'Yearly',
    'income.type.yearly.hint': 'Once or a few times a year',
    'income.type.irregular': 'Irregular',
    'income.type.irregular.hint': 'Varies week to week',
    'income.sourcesLabel': 'Income sources',
    'income.cat.salary': 'Salary',
    'income.cat.freelancing': 'Freelancing',
    'income.cat.business': 'Business',
    'income.cat.scholarship': 'Scholarship',
    'income.cat.other': 'Other',
    'income.category': 'Type',
    'income.name': 'Name',
    'income.namePlaceholder': 'e.g. Office job, tuition, shop',
    'income.amount.monthly': 'Amount per month',
    'income.amount.yearly': 'Amount per year',
    'income.amount.irregular': 'Typical amount per month',
    'income.remove': 'Remove this source',
    'income.add': 'Add income source',
    'income.empty': 'No income sources yet. Add your first one below.',
    'income.total.monthly': 'Total monthly income',
    'income.total.yearly': 'Total yearly income',
    'income.total.irregular': 'Estimated monthly income',
    'income.errorAmount': 'Enter an amount greater than 0.',
    'income.required': 'Add at least one income source with an amount.',
  },
  bn: {
    'income.title': 'আপনার আয়',
    'income.lead': 'আপনি যেসব উৎস থেকে টাকা পান, সবগুলো যোগ করুন। পরে বদলাতে পারবেন।',
    'income.typeLabel': 'আপনি সাধারণত কীভাবে আয় পান?',
    'income.type.monthly': 'মাসিক',
    'income.type.monthly.hint': 'প্রতি মাসে একই সময়ে',
    'income.type.yearly': 'বার্ষিক',
    'income.type.yearly.hint': 'বছরে এক বা কয়েকবার',
    'income.type.irregular': 'অনিয়মিত',
    'income.type.irregular.hint': 'সপ্তাহে সপ্তাহে বদলায়',
    'income.sourcesLabel': 'আয়ের উৎস',
    'income.cat.salary': 'বেতন',
    'income.cat.freelancing': 'ফ্রিল্যান্সিং',
    'income.cat.business': 'ব্যবসা',
    'income.cat.scholarship': 'বৃত্তি',
    'income.cat.other': 'অন্যান্য',
    'income.category': 'ধরন',
    'income.name': 'নাম',
    'income.namePlaceholder': 'যেমন: অফিসের চাকরি, টিউশনি, দোকান',
    'income.amount.monthly': 'মাসিক পরিমাণ',
    'income.amount.yearly': 'বার্ষিক পরিমাণ',
    'income.amount.irregular': 'মাসে সাধারণত কত',
    'income.remove': 'এই উৎসটি সরান',
    'income.add': 'আয়ের উৎস যোগ করুন',
    'income.empty': 'এখনো কোনো আয়ের উৎস নেই। নিচে প্রথমটি যোগ করুন।',
    'income.total.monthly': 'মোট মাসিক আয়',
    'income.total.yearly': 'মোট বার্ষিক আয়',
    'income.total.irregular': 'আনুমানিক মাসিক আয়',
    'income.errorAmount': '০-এর বেশি একটি পরিমাণ লিখুন।',
    'income.required': 'অন্তত একটি আয়ের উৎস ও তার পরিমাণ যোগ করুন।',
  },
});

const CATEGORY_ICONS = {
  salary: 'fa-briefcase',
  freelancing: 'fa-laptop',
  business: 'fa-store',
  scholarship: 'fa-graduation-cap',
  other: 'fa-coins',
};

const TYPE_ICONS = {
  monthly: 'fa-calendar-days',
  yearly: 'fa-calendar-check',
  irregular: 'fa-wave-square',
};

function total(sources) {
  return sources.filter(isValidIncomeSource).reduce((sum, s) => sum + s.amount, 0);
}

function renderTypeOption(type, current, t, lang) {
  const active = type === current;
  return `
    <label class="choice${active ? ' is-active' : ''}">
      <input type="radio" name="income-type" value="${type}" class="sr-only" ${active ? 'checked' : ''}>
      <i class="fa-solid ${TYPE_ICONS[type]} choice__icon" aria-hidden="true"></i>
      <span class="choice__title">${t(`income.type.${type}`, lang)}</span>
      <span class="choice__hint">${t(`income.type.${type}.hint`, lang)}</span>
    </label>`;
}

function renderSourceRow(src, index, incomeType, t, lang) {
  const catOptions = INCOME_CATEGORIES.map(
    (c) => `<option value="${c}" ${c === src.category ? 'selected' : ''}>${t(`income.cat.${c}`, lang)}</option>`,
  ).join('');
  const amountValue = src.amount ?? '';
  const invalid = src.amount !== null && !isValidIncomeSource(src);

  return `
    <li class="source" data-id="${src.id}">
      <div class="source__icon" aria-hidden="true"><i class="fa-solid ${CATEGORY_ICONS[src.category]}"></i></div>
      <div class="source__fields">
        <div class="field">
          <label class="field__label" for="cat-${src.id}">${t('income.category', lang)}</label>
          <select id="cat-${src.id}" class="field__input" data-field="category">${catOptions}</select>
        </div>
        <div class="field">
          <label class="field__label" for="name-${src.id}">${t('income.name', lang)}</label>
          <input id="name-${src.id}" class="field__input" data-field="name" type="text" maxlength="60"
                 autocomplete="off" placeholder="${t('income.namePlaceholder', lang)}"
                 value="${escapeHtml(src.name)}">
        </div>
        <div class="field">
          <label class="field__label" for="amt-${src.id}">${t(`income.amount.${incomeType}`, lang)}</label>
          <div class="money-input">
            <span class="money-input__prefix" aria-hidden="true">৳</span>
            <input id="amt-${src.id}" class="field__input" data-field="amount" type="text"
                   inputmode="decimal" autocomplete="off" placeholder="0"
                   value="${amountValue}" aria-invalid="${invalid}"
                   aria-describedby="err-${src.id}">
          </div>
          <p id="err-${src.id}" class="field__error" ${invalid ? '' : 'hidden'}>${t('income.errorAmount', lang)}</p>
        </div>
      </div>
      <button type="button" class="icon-btn source__remove" data-action="remove"
              aria-label="${t('income.remove', lang)} ${index + 1}" title="${t('income.remove', lang)}">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
      </button>
    </li>`;
}

export default {
  id: 'income',
  titleKey: 'income.title',
  hintKey: 'income.required',

  /** Runs before the first render. Adds one salary row so the screen is never empty. */
  onEnter(store) {
    if (store.get().income.sources.length === 0) {
      store.update((s) => { s.income.sources.push(createIncomeSource('salary')); });
    }
  },

  /** Complete when there is at least one source and every source has a valid amount. */
  isComplete: (state) =>
    state.income.sources.length > 0 && state.income.sources.every(isValidIncomeSource),

  render({ state, t, lang }) {
    const { type, sources } = state.income;
    const rows = sources.map((s, i) => renderSourceRow(s, i, type, t, lang)).join('');

    return `
      <section class="screen" aria-labelledby="income-title">
        <div class="screen__icon" aria-hidden="true"><i class="fa-solid fa-wallet"></i></div>
        <h1 id="income-title" class="screen__title">${t('income.title', lang)}</h1>
        <p class="screen__lead">${t('income.lead', lang)}</p>

        <fieldset class="group">
          <legend class="group__label">${t('income.typeLabel', lang)}</legend>
          <div class="choices">
            ${INCOME_TYPES.map((ty) => renderTypeOption(ty, type, t, lang)).join('')}
          </div>
        </fieldset>

        <fieldset class="group">
          <legend class="group__label">${t('income.sourcesLabel', lang)}</legend>
          ${sources.length
            ? `<ul class="sources">${rows}</ul>`
            : `<p class="empty">${t('income.empty', lang)}</p>`}
          <button type="button" class="btn btn--ghost btn--block" data-action="add">
            <i class="fa-solid fa-plus" aria-hidden="true"></i> ${t('income.add', lang)}
          </button>
        </fieldset>

        <div class="total" aria-live="polite">
          <span class="total__label">${t(`income.total.${type}`, lang)}</span>
          <strong class="total__value" data-total>${formatMoney(total(sources), lang)}</strong>
        </div>
      </section>`;
  },

  mount(root, { store }) {
    const lang = () => store.get().user.language;

    const updateTotal = () => {
      const el = root.querySelector('[data-total]');
      if (el) el.textContent = formatMoney(total(store.get().income.sources), lang());
    };

    const onClick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'add') {
        const src = createIncomeSource(store.get().income.sources.length ? 'other' : 'salary');
        store.update((s) => { s.income.sources.push(src); }, { rerender: true });
        root.querySelector(`#name-${src.id}`)?.focus();
      }

      if (btn.dataset.action === 'remove') {
        const id = btn.closest('.source').dataset.id;
        store.update((s) => {
          s.income.sources = s.income.sources.filter((x) => x.id !== id);
        }, { rerender: true });
        root.querySelector('[data-action="add"]')?.focus();
      }
    };

    const onChange = (e) => {
      // Income type radio: labels are re-rendered, so rerender.
      if (e.target.name === 'income-type') {
        store.update((s) => { s.income.type = e.target.value; }, { rerender: true });
        root.querySelector(`input[name="income-type"][value="${e.target.value}"]`)?.focus();
        return;
      }
      // Category select: update the icon in place (no rerender, keeps focus).
      if (e.target.dataset.field === 'category') {
        const row = e.target.closest('.source');
        const id = row.dataset.id;
        store.update((s) => {
          const src = s.income.sources.find((x) => x.id === id);
          if (src) src.category = e.target.value;
        });
        row.querySelector('.source__icon i').className = `fa-solid ${CATEGORY_ICONS[e.target.value]}`;
      }
    };

    const onInput = (e) => {
      const field = e.target.dataset.field;
      if (field !== 'name' && field !== 'amount') return;
      const row = e.target.closest('.source');
      const id = row.dataset.id;

      store.update((s) => {
        const src = s.income.sources.find((x) => x.id === id);
        if (!src) return;
        if (field === 'name') src.name = e.target.value;
        if (field === 'amount') src.amount = parseAmount(e.target.value);
      });

      if (field === 'amount') {
        const src = store.get().income.sources.find((x) => x.id === id);
        const invalid = e.target.value.trim() !== '' && !isValidIncomeSource(src);
        e.target.setAttribute('aria-invalid', String(invalid));
        row.querySelector('.field__error').hidden = !invalid;
        updateTotal();
      }
    };

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);

    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('input', onInput);
    };
  },
};
