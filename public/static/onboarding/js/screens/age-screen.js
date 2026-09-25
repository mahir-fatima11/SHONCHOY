/**
 * Screen 1 — 18+ age confirmation
 * ------------------------------------------------------------------
 * One checkbox: "I am 18 or older". Writes ONLY the boolean
 * state.user.ageConfirmed. We never ask for a date of birth or an exact age.
 * Continue stays disabled until the box is ticked.
 */
import { registerStrings } from '../i18n.js';

registerStrings({
  en: {
    'age.title': 'Before we begin',
    'age.lead': '$honchoy helps you plan your income, spending and savings. It is made for adults.',
    'age.checkbox': 'I confirm that I am 18 years of age or older.',
    'age.privacy': 'We only record that you confirmed this. We never ask for or store your date of birth or exact age.',
    'age.required': 'Please confirm you are 18 or older to continue.',
  },
  bn: {
    'age.title': 'শুরু করার আগে',
    'age.lead': '$honchoy আপনার আয়, খরচ ও সঞ্চয়ের পরিকল্পনা করতে সাহায্য করে। এটি প্রাপ্তবয়স্কদের জন্য তৈরি।',
    'age.checkbox': 'আমি নিশ্চিত করছি যে আমার বয়স ১৮ বছর বা তার বেশি।',
    'age.privacy': 'আমরা শুধু এটুকু রাখি যে আপনি নিশ্চিত করেছেন। আপনার জন্মতারিখ বা সঠিক বয়স আমরা কখনো জানতে চাই না বা সংরক্ষণ করি না।',
    'age.required': 'এগিয়ে যেতে অনুগ্রহ করে নিশ্চিত করুন যে আপনার বয়স ১৮ বা তার বেশি।',
  },
});

export default {
  id: 'age',
  titleKey: 'age.title',
  hintKey: 'age.required',

  isComplete: (state) => state.user.ageConfirmed === true,

  render({ state, t, lang }) {
    const checked = state.user.ageConfirmed;
    return `
      <section class="screen" aria-labelledby="age-title">
        <div class="screen__icon" aria-hidden="true"><i class="fa-solid fa-shield-heart"></i></div>
        <h1 id="age-title" class="screen__title">${t('age.title', lang)}</h1>
        <p class="screen__lead">${t('age.lead', lang)}</p>

        <label class="consent${checked ? ' is-checked' : ''}" for="age-confirm">
          <input type="checkbox" id="age-confirm" class="consent__input"
                 ${checked ? 'checked' : ''} aria-describedby="age-privacy">
          <span class="consent__box" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
          <span class="consent__label">${t('age.checkbox', lang)}</span>
        </label>

        <p id="age-privacy" class="note">
          <i class="fa-solid fa-lock" aria-hidden="true"></i>
          <span>${t('age.privacy', lang)}</span>
        </p>
      </section>`;
  },

  mount(root, { store }) {
    const input = root.querySelector('#age-confirm');
    const onChange = () => {
      store.update((s) => { s.user.ageConfirmed = input.checked; });
    };
    input.addEventListener('change', onChange);
    return () => input.removeEventListener('change', onChange);
  },
};
