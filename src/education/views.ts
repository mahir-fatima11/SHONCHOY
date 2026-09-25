/**
 * $honchoy — views for the insight & education module.
 *
 * Three routes: `#/insights`, `#/learn`, `#/safety`. Each view is a pure
 * function returning an HTML string, in the same style as `client.ts`, and
 * reuses the shared design-system classes (card, stat, bar-row, badge, dial…).
 * Module-specific classes are prefixed `edu-` in `style.css`.
 */
import type { Analysis } from '../types'
import { buildInsights } from './insights'
import { fillAmounts, lessons } from './lessons'
import type { Lesson } from './lessons'
import { redFlags } from './scams'
import type { ScamCheckResult } from './scams'

type Fmt = (n: number) => string

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const pct = (v: number) => `${Math.round((Number.isFinite(v) ? v : 0) * 100)}%`
const width = (v: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0).toFixed(1)

const BAND_LABEL: Record<Analysis['health']['band'], string> = {
  strong: 'Strong',
  okay: 'Getting there',
  stretched: 'Building up',
  at_risk: 'Needs care',
}

function bar(label: string, value: number, max: number, tone: string, text: string): string {
  return `<div class="bar-row">
    <span class="bar-row__label">${esc(label)}</span>
    <span class="bar"><span class="bar__fill bar__fill--${tone}" style="width:${width(value, max)}%"></span></span>
    <span class="bar-row__value">${esc(text)}</span>
  </div>`
}

/* ═══════════════════════ Insights ═══════════════════════════ */

export function viewInsights(a: Analysis, money: Fmt): string {
  const s = buildInsights(a, money)
  const out = s.livingCosts + s.loanPayments
  const max = Math.max(s.income, out, 1)
  const ringColor =
    s.score >= 80 ? 'var(--good)' : s.score >= 60 ? 'var(--pink-500)' : s.score >= 40 ? 'var(--warn)' : 'var(--danger)'
  const goals = a.goals

  return `
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>How your money is doing</h1>
        <p class="card__hint">A simple picture of this month, in plain words. Change your numbers on the other tabs and this updates straight away.</p>
      </div>
    </div>

    <div class="edu-hero">
      <div class="edu-score">
        <div class="dial__ring" style="--pct:${s.score};--ring:${ringColor}" role="img"
             aria-label="Money health score ${s.score} out of 100">
          <div class="dial__inner">
            <span class="dial__score">${s.score}</span>
            <span class="dial__caption">out of 100</span>
          </div>
        </div>
        <p class="edu-score__label">${esc(BAND_LABEL[s.band])}</p>
        <p class="small muted">${esc(s.scoreWords)}</p>
        ${
          s.scoreReasons.length
            ? `<details class="edu-why">
                <summary>What would raise my score?</summary>
                <ul>${s.scoreReasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
              </details>`
            : ''
        }
      </div>

      <div class="edu-insights">
        <h2>What we notice</h2>
        <ul class="edu-insight-list">
          ${s.insights
            .map(
              (i) => `<li class="edu-insight edu-insight--${i.tone}">
                <p>${esc(i.text)}</p>
                ${i.lesson ? `<a class="edu-link" href="#/learn" data-action="lesson-open" data-id="${esc(i.lesson)}">Learn how →</a>` : ''}
              </li>`,
            )
            .join('')}
        </ul>
      </div>
    </div>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${stat('Money in', money(s.income), 'each month')}
    ${stat('Money out', money(out), `${pct(s.spentShare)} of income`)}
    ${stat('Left over', money(s.leftOver), 'after costs and loans', s.leftOver < 0 ? 'danger' : 'good')}
    ${stat('Planned saving', money(s.plannedSaving), `${pct(s.plannedSavingShare)} of income`, 'pink')}
  </div>

  <div class="grid grid--2 edu-grid" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Money in vs. money out</h2></div></div>
      ${bar('Income', s.income, max, 'good', money(s.income))}
      ${bar('Living costs', s.livingCosts, max, 'pink', money(s.livingCosts))}
      ${bar('Loan payments', s.loanPayments, max, 'warn', money(s.loanPayments))}
      ${bar('Left over', Math.max(0, s.leftOver), max, 'info', money(s.leftOver))}
      <p class="small muted" style="margin-top:var(--space-4)">
        Fixed costs (the same every month): <strong>${esc(money(a.expenses.fixed))}</strong> ·
        Changeable costs: <strong>${esc(money(a.expenses.variable))}</strong>.
        Changeable costs are usually the easiest place to save.
      </p>
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Savings &amp; goals</h2></div></div>
      ${
        s.emergency.target > 0
          ? `<div class="edu-goal">
              <div class="row row--between"><strong>Safety cushion</strong><span class="small muted">${esc(money(s.emergency.saved))} of ${esc(money(s.emergency.target))}</span></div>
              <span class="bar"><span class="bar__fill" style="width:${width(s.emergency.ratio, 1)}%"></span></span>
              <span class="small muted">${
                s.emergency.ratio >= 1
                  ? 'Full — well done!'
                  : `${pct(s.emergency.ratio)} full${s.emergency.fundedMonth ? ` · full by ${esc(monthWords(s.emergency.fundedMonth))} on the plan` : ''}`
              }</span>
            </div>`
          : ''
      }
      ${
        goals.filter((g) => g.type !== 'emergency_fund').length === 0
          ? `<p class="small muted">No goals yet. What would you love to save for? Add one on the <a href="#/goals">Goals</a> tab.</p>`
          : goals
              .filter((g) => g.type !== 'emergency_fund')
              .map(
                (g) => `<div class="edu-goal">
                  <div class="row row--between"><strong>⭐ ${esc(g.name)}</strong><span class="small muted">${esc(money(g.saved))} of ${esc(money(g.cost))}</span></div>
                  <span class="bar"><span class="bar__fill bar__fill--${g.completed ? 'good' : 'info'}" style="width:${width(g.progress, 1)}%"></span></span>
                  <span class="small muted">${
                    g.completed
                      ? 'Reached — congratulations! 🎉'
                      : `${pct(g.progress)} there · ${esc(money(g.remaining))} to go${g.fundedMonth ? ` · ready by ${esc(monthWords(g.fundedMonth))}` : ''}`
                  }</span>
                </div>`,
              )
              .join('')
      }
      <p class="small muted" style="margin-top:var(--space-3)">
        Saved so far across everything: <strong>${esc(money(s.totalSaved))}</strong>${s.totalTarget > 0 ? ` of ${esc(money(s.totalTarget))} (${pct(s.totalSaved / s.totalTarget)})` : ''}.
      </p>
    </section>
  </div>`
}

function stat(label: string, value: string, meta: string, tone?: 'pink' | 'good' | 'danger'): string {
  return `<article class="stat">
    <span class="stat__label">${esc(label)}</span>
    <span class="stat__value${tone ? ` stat__value--${tone}` : ''}">${esc(value)}</span>
    <span class="stat__meta">${esc(meta)}</span>
  </article>`
}

function monthWords(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/* ═══════════════════════ Learn ═══════════════════════════ */

export function viewLearn(read: Set<string>, money: Fmt): string {
  const done = lessons.filter((l) => read.has(l.id)).length
  return `
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Money basics, made simple</h1>
        <p class="card__hint">Short lessons with no jargon — about 2 minutes each. Tap a card to read it.</p>
      </div>
      <span class="badge badge--${done === lessons.length ? 'good' : 'muted'}">${done} of ${lessons.length} read</span>
    </div>
    <span class="bar edu-progress"><span class="bar__fill" style="width:${width(done, lessons.length)}%"></span></span>
  </section>

  <div class="edu-lessons" style="margin-top:var(--space-4)">
    ${lessons
      .map(
        (l) => `<button type="button" class="edu-lesson${read.has(l.id) ? ' is-read' : ''}" data-action="lesson-open" data-id="${esc(l.id)}">
          <span class="edu-lesson__icon" aria-hidden="true">${esc(l.icon)}</span>
          <span class="edu-lesson__topic">${esc(l.topic)} · ${l.minutes} min</span>
          <strong class="edu-lesson__title">${esc(l.title)}</strong>
          <span class="edu-lesson__idea">${esc(fillAmounts(l.bigIdea, money))}</span>
          <span class="edu-lesson__cta">${read.has(l.id) ? '✓ Read' : 'Read lesson →'}</span>
        </button>`,
      )
      .join('')}
  </div>`
}

/** Modal body for one lesson. */
export function lessonBody(l: Lesson, money: Fmt): string {
  const idx = lessons.findIndex((x) => x.id === l.id)
  const next = lessons[(idx + 1) % lessons.length]
  return `
  <article class="edu-reader">
    <span class="edu-lesson__icon edu-lesson__icon--big" aria-hidden="true">${esc(l.icon)}</span>
    <span class="edu-lesson__topic">${esc(l.topic)} · ${l.minutes} min read</span>
    <p class="edu-reader__idea">${esc(l.bigIdea)}</p>
    ${l.body.map((p) => `<p>${esc(fillAmounts(p, money))}</p>`).join('')}
    <div class="edu-box edu-box--example"><strong>For example</strong><p>${esc(fillAmounts(l.example, money))}</p></div>
    <div class="edu-box edu-box--try"><strong>Try this</strong><p>${esc(fillAmounts(l.tryThis, money))}</p></div>
    <div class="row row--end">
      <button type="button" class="btn btn--ghost" data-action="lesson-next" data-id="${esc(l.id)}" data-next="${esc(next.id)}">Next: ${esc(next.title)}</button>
      <button type="button" class="btn" data-action="lesson-done" data-id="${esc(l.id)}">Got it ✓</button>
    </div>
  </article>`
}

/* ═══════════════════════ Stay safe ═══════════════════════════ */

export function viewSafety(mode: 'questions' | 'paste', text: string): string {
  return `
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Is this offer safe?</h1>
        <p class="card__hint">Scammers are clever, but they use the same tricks again and again. Check any offer before you pay — it only takes a minute.</p>
      </div>
    </div>

    <div class="seg" role="group" aria-label="How to check">
      <button type="button" data-action="scam-mode" data-id="questions" aria-pressed="${mode === 'questions'}">Answer questions</button>
      <button type="button" data-action="scam-mode" data-id="paste" aria-pressed="${mode === 'paste'}">Paste a message</button>
    </div>

    ${
      mode === 'questions'
        ? `<form id="scam-questions-form" class="edu-questions" style="margin-top:var(--space-4)">
            <p class="small muted">Think about the offer and answer honestly.</p>
            <ol>
              ${redFlags
                .map(
                  (f) => `<li>
                    <span>${esc(f.question)}</span>
                    <span class="edu-yn" role="radiogroup" aria-label="${esc(f.question)}">
                      <label><input type="radio" name="${esc(f.id)}" value="yes"><span>Yes</span></label>
                      <label><input type="radio" name="${esc(f.id)}" value="no"><span>No</span></label>
                      <label><input type="radio" name="${esc(f.id)}" value="unsure"><span>Not sure</span></label>
                    </span>
                  </li>`,
                )
                .join('')}
            </ol>
            <button class="btn" type="submit">Check this offer</button>
          </form>`
        : `<form id="scam-text-form" style="margin-top:var(--space-4)">
            <label class="field">
              <span class="field__label">Paste the SMS, WhatsApp or Facebook message</span>
              <textarea class="textarea" name="text" rows="5" placeholder="e.g. Congratulations! Guaranteed 40% profit every month. Only today — pay a small registration fee to join…">${esc(text)}</textarea>
            </label>
            <div class="row" style="margin-top:var(--space-3)">
              <button class="btn" type="submit">Check this message</button>
              <span class="small muted">Checked on your device — nothing is saved or sent.</span>
            </div>
          </form>`
    }
    <div id="scam-result" aria-live="polite"></div>
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Red flags to watch for</h2></div></div>
    <div class="edu-flags">
      ${redFlags
        .map(
          (f) => `<details class="edu-flag">
            <summary><span aria-hidden="true">${esc(f.icon)}</span><strong>${esc(f.title)}</strong></summary>
            <p class="edu-flag__quote">${esc(f.whatItSounds)}</p>
            <p class="small"><strong>Why it’s risky:</strong> ${esc(f.whyRisky)}</p>
            <p class="small edu-flag__do">💗 ${esc(f.whatToDo)}</p>
          </details>`,
        )
        .join('')}
    </div>
  </section>

  <section class="card edu-rules" style="margin-top:var(--space-4)">
    <h2>Golden rules</h2>
    <ul>
      <li>Never share your PIN or OTP code with anyone.</li>
      <li>If it sounds too good to be true, it is.</li>
      <li>Take your time — a real offer can wait a day.</li>
      <li>Talk it over with someone you trust before paying.</li>
    </ul>
  </section>`
}

export function scamResult(r: ScamCheckResult, unsure = 0): string {
  const cls = r.level === 'high' ? 'high' : r.level === 'medium' ? 'warn' : 'good'
  const icon = r.level === 'low' ? '✓' : '!'
  return `<div class="flag flag--${cls} edu-result">
    <span class="flag__icon" aria-hidden="true">${icon}</span>
    <div>
      <div class="flag__title">${esc(r.headline)}</div>
      <div class="flag__text">${esc(r.advice)}</div>
      ${unsure ? `<p class="small muted" style="margin:var(--space-2) 0 0">You weren’t sure about ${unsure} question${unsure > 1 ? 's' : ''}. When in doubt, ask them to explain — a real business won’t mind.</p>` : ''}
      ${
        r.matched.length
          ? `<ul class="edu-result__list">${r.matched
              .map(
                (m) => `<li><strong>${esc(m.title)}</strong>${
                  m.evidence.length ? ` <span class="badge badge--muted">found: ${m.evidence.map((e) => `“${esc(e)}”`).join(', ')}</span>` : ''
                }<br><span class="small muted">${esc(m.whatToDo)}</span></li>`,
              )
              .join('')}</ul>`
          : ''
      }
    </div>
  </div>`
}
