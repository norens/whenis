// Smoke harness: run the hutshub-chatbot DateResolverService test universe
// through the whenis parser and report which inputs match expectations.
//
// Reference (anchor) = 2026-04-29 (Wed), tz = Europe/Kyiv (matches hutshub TODAY).
// Some tests use ad-hoc anchors — see CASES entries with their own `today`.

import { createParser } from '../packages/core/dist/index.js';
import { uk } from '../packages/locale-uk/dist/index.js';
import { en } from '../packages/locale-en/dist/index.js';
import { booking } from '../packages/booking/dist/index.js';

const parser = createParser({
  locales: [uk, en],
  plugins: [booking],
});

const DEFAULT_TODAY = '2026-04-29';

// Each case: { input, today?, expect: { date?, range_end?, nights?, window?, reason? } }
// Only what's relevant to the assertion is included.
const CASES = [
  // DD.MM family (GAP-2)
  { id: 'HH-2886/range', input: '12.06-22.06', expect: { date: '2026-06-12', end: '2026-06-22' } },
  { id: 'HH-2886/range-spaces', input: '12.06 - 22.06', expect: { date: '2026-06-12', end: '2026-06-22' } },
  { id: 'HH-2886/range-current-yr', input: '01.05-03.05', expect: { date: '2026-05-01', end: '2026-05-03' } },
  { id: 'HH-2886/past-rolls', input: '15.04', today: '2026-04-29', expect: { date: '2027-04-15' } },
  { id: 'HH-2886/future-stays', input: '15.07', expect: { date: '2026-07-15' } },
  { id: 'HH-2886/full-yyyy', input: '12.06.2025', expect: { date: '2025-06-12' } },
  { id: 'HH-2886/invalid', input: '40.13', expect: { unresolved: true } },

  // Immediate keywords
  { id: 'imm/today', input: 'сьогодні', expect: { date: '2026-04-29' } },
  { id: 'imm/tomorrow', input: 'завтра', expect: { date: '2026-04-30' } },
  { id: 'imm/today-en', input: 'today', expect: { date: '2026-04-29' } },
  { id: 'imm/tomorrow-en', input: 'tomorrow', expect: { date: '2026-04-30' } },
  { id: 'imm/позавтра', input: 'позавтра', expect: { date: '2026-05-01' } },
  { id: 'imm/післязавтра', input: 'післязавтра', expect: { date: '2026-05-01' } },

  // Weekdays
  { id: 'wd/наступна-п', input: "наступна п'ятниця", expect: { date: '2026-05-08' } },
  { id: 'wd/наступну-п', input: "наступну п'ятницю", expect: { date: '2026-05-08' } },
  { id: 'wd/наступної-п', input: "наступної п'ятниці", expect: { date: '2026-05-08' } },
  { id: 'wd/наступний-пн', input: 'наступний понеділок', expect: { date: '2026-05-04' } },
  { id: 'wd/наступну-середу-from-wed', input: 'наступну середу', expect: { date: '2026-05-06' } },
  { id: 'wd/цю-пятницю', input: "цю п'ятницю", expect: { date: '2026-05-01' } },
  { id: 'wd/this-monday-from-wed-past', input: 'цей понеділок', expect: { reason: 'past_date' } },

  // Через N
  { id: 'через/тиждень', input: 'через тиждень', expect: { date: '2026-05-06' } },
  { id: 'через/3-дні', input: 'через 3 дні', expect: { date: '2026-05-02' } },
  { id: 'через/два-тижні', input: 'через два тижні', expect: { date: '2026-05-13' } },

  // Weekend phrases
  { id: 'we/наступні-from-wed', input: 'наступні вихідні', expect: { date: '2026-05-09', end: '2026-05-10' } },
  { id: 'we/наступні-from-fri', input: 'наступні вихідні', today: '2026-05-01', expect: { date: '2026-05-09', end: '2026-05-10' } },
  { id: 'we/наступні-from-sat', input: 'наступні вихідні', today: '2026-05-02', expect: { date: '2026-05-09', end: '2026-05-10' } },
  { id: 'we/наступні-from-sun', input: 'наступні вихідні', today: '2026-05-03', expect: { date: '2026-05-09', end: '2026-05-10' } },
  { id: 'we/ці-from-wed', input: 'ці вихідні', expect: { date: '2026-05-02', end: '2026-05-03' } },
  { id: 'we/ці-from-fri', input: 'ці вихідні', today: '2026-05-01', expect: { date: '2026-05-02', end: '2026-05-03' } },
  { id: 'we/на-вихідні', input: 'на вихідні', expect: { date: '2026-05-02', end: '2026-05-03' } },
  { id: 'we/this-weekend-en', input: 'this weekend', expect: { date: '2026-05-02', end: '2026-05-03' } },
  { id: 'we/next-weekend-en', input: 'next weekend', expect: { date: '2026-05-09', end: '2026-05-10' } },

  // Last weekend (GAP-11)
  { id: 'lwe/травня', input: 'останні вихідні травня', expect: { date: '2026-05-30', end: '2026-05-31' } },
  { id: 'lwe/червня', input: 'останні вихідні червня', expect: { date: '2026-06-27', end: '2026-06-28' } },
  { id: 'lwe/в-травні', input: 'останні вихідні в травні', expect: { date: '2026-05-30', end: '2026-05-31' } },
  { id: 'lwe/no-month', input: 'останні вихідні', expect: { date: '2026-04-25', end: '2026-04-26' } },
  { id: 'lwe/морфологія', input: 'останніх вихідних травня', expect: { date: '2026-05-30', end: '2026-05-31' } },

  // Closest weekend
  { id: 'we/найближчі-from-wed', input: 'найближчі вихідні', expect: { date: '2026-05-02', end: '2026-05-03' } },
  { id: 'we/найближчі-from-sat', input: 'найближчі вихідні', today: '2026-05-02', expect: { date: '2026-05-09', end: '2026-05-10' } },

  // ISO + ordinal + day-month
  { id: 'iso/passthrough', input: '2026-08-15', expect: { date: '2026-08-15' } },
  { id: 'dm/5-серпня', input: '5 серпня', expect: { date: '2026-08-05' } },
  { id: 'dm/першого-травня', input: 'першого травня', expect: { date: '2026-05-01' } },
  { id: 'dm/rolls-next-year', input: '5 січня', expect: { date: '2027-01-05' } },

  // English
  { id: 'en/next-friday', input: 'next Friday', expect: { date: '2026-05-08' } },

  // Apostrophe variants
  { id: 'apos/U+2019', input: 'наступна п’ятниця', expect: { date: '2026-05-08' } },
  { id: 'apos/U+02BC', input: 'наступна пʼятниця', expect: { date: '2026-05-08' } },
  { id: 'apos/backtick', input: 'наступна п`ятниця', expect: { date: '2026-05-08' } },

  // Negative
  { id: 'neg/четверо', input: 'четверо людей', expect: { noWeekday: true } },

  // Past guard
  { id: 'past/iso', input: '2024-01-01', expect: { reason: 'past_date' } },
  { id: 'past/dd.mm-rolls', input: '15.04', expect: { date: '2027-04-15' } },
  { id: 'past/today-iso', input: '2026-04-29', expect: { date: '2026-04-29' } },

  // Vague markers
  { id: 'vague/десь-у-травні', input: 'десь у травні', expect: { unresolved: true } },
  { id: 'vague/колись-у-червні', input: 'колись у червні', expect: { unresolved: true } },
  { id: 'vague/приблизно-в-серпні', input: 'приблизно в серпні', expect: { unresolved: true } },
  { id: 'vague/можливо-в-липні', input: 'можливо в липні', expect: { unresolved: true } },
  { id: 'vague/trailing', input: '5 червня приблизно', expect: { unresolved: true } },
  { id: 'vague/trailing-ord', input: 'першого травня можливо', expect: { unresolved: true } },

  // Vague + mostly past (mostlyPastEnricher)
  { id: 'vague/mostly-past', input: 'десь у травні', today: '2026-05-27', expect: { suggestNextMonth: true } },
  { id: 'vague/early-month', input: 'десь у травні', today: '2026-05-04', expect: { reason: 'vague_month' } },

  // Holiday refs
  { id: 'hol/після-свят', input: 'після свят', expect: { reason: 'holiday_ref' } },
  { id: 'hol/на-свята', input: 'на свята', expect: { reason: 'holiday_ref' } },

  // End-of-week / end-of-month (GAP-9)
  { id: 'eow/тижня', input: 'до кінця тижня', expect: { window: { from: '2026-04-29', to: '2026-05-03' } } },
  { id: 'eow/місяця', input: 'до кінця місяця', today: '2026-05-27', expect: { window: { from: '2026-05-27', to: '2026-05-31' } } },

  // Windows
  { id: 'win/впродовж-7', input: 'впродовж 7 днів', expect: { window: { from: '2026-04-29', to: '2026-05-05' } } },
  { id: 'win/впродовж-наступних-3', input: 'впродовж наступних 3 днів', expect: { window: { from: '2026-04-29', to: '2026-05-01' } } },
  { id: 'win/у-найближчі-5', input: 'у найближчі 5 днів', expect: { window: { from: '2026-04-29', to: '2026-05-03' } } },

  // Stay only
  { id: 'stay/5-ночей', input: 'на 5 ночей', expect: { nights: 5, dateNull: true } },
  { id: 'stay/3-дні', input: 'на 3 дні', expect: { nights: 3, dateNull: true } },
  { id: 'stay/2-ночі', input: 'на 2 ночі', expect: { nights: 2, dateNull: true } },

  // From-to ranges
  { id: 'range/з-до', input: 'з 5 до 10 червня', expect: { date: '2026-06-05', end: '2026-06-10', nights: 5 } },
  { id: 'range/від-до', input: 'від 1 до 8 серпня', expect: { date: '2026-08-01', end: '2026-08-08', nights: 7 } },
  { id: 'range/з-по', input: 'з 5 по 10 червня', expect: { date: '2026-06-05', end: '2026-06-11', nights: 6 } },

  // Date + nights (GAP-10)
  { id: 'gap10/з-5-черв-на-3', input: 'з 5 червня на 3 ночі', expect: { date: '2026-06-05', end: '2026-06-08', nights: 3 } },
  { id: 'gap10/5-черв-на-2', input: '5 червня на 2 ночі', expect: { date: '2026-06-05', end: '2026-06-07', nights: 2 } },
];

function pickBest(parseResult) {
  if (!parseResult.matches.length) return null;
  // Take the longest-span match's top candidate
  const m = parseResult.matches.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  return { match: m, cand: m.candidates[0] ?? null };
}

function reasonOf(c) {
  return c?.reason ?? c?.metadata?.reason;
}

function evaluate(c, exp) {
  // unresolved expectations: a parse may still produce a fuzzy/0-conf candidate
  if (exp.unresolved) {
    if (!c) return { ok: true };
    if (c.confidence === 0 || c.type === 'fuzzy') return { ok: true };
    if (c.reason && c.reason !== 'past_date') return { ok: true };
    return { ok: false, why: `got resolved (${c.type} ${c.date ?? c.start ?? ''})` };
  }
  if (exp.reason) {
    if (reasonOf(c) === exp.reason) return { ok: true };
    return { ok: false, why: `reason=${reasonOf(c) ?? 'none'} expected=${exp.reason}` };
  }
  if (exp.dateNull && exp.nights !== undefined) {
    if (!c) return { ok: false, why: 'no candidate' };
    if (c.nights === exp.nights && !c.date) return { ok: true };
    return { ok: false, why: `nights=${c.nights} date=${c.date} expected nights=${exp.nights} date=null` };
  }
  if (exp.window) {
    if (!c) return { ok: false, why: 'no candidate' };
    if (c.type === 'window' && c.start === exp.window.from && c.end === exp.window.to) return { ok: true };
    return { ok: false, why: `got ${c.type} ${c.start ?? c.date}..${c.end} expected window ${exp.window.from}..${exp.window.to}` };
  }
  if (exp.noWeekday) {
    if (!c) return { ok: true };
    // A weekday rule would emit a 'date' candidate near anchor; if none, fine.
    return { ok: c.type !== 'date', why: `unexpected ${c.type} ${c.date}` };
  }
  if (exp.date && exp.end) {
    if (!c) return { ok: false, why: 'no candidate' };
    const start = c.start ?? c.date;
    if (start === exp.date && c.end === exp.end) {
      if (exp.nights !== undefined && c.nights !== exp.nights) {
        return { ok: false, why: `nights=${c.nights} expected ${exp.nights}` };
      }
      return { ok: true };
    }
    return { ok: false, why: `${start}..${c.end} expected ${exp.date}..${exp.end}` };
  }
  if (exp.date) {
    if (!c) return { ok: false, why: 'no candidate' };
    const start = c.date ?? c.start;
    if (start === exp.date) return { ok: true };
    return { ok: false, why: `got ${c.type} ${start} expected date ${exp.date}` };
  }
  if (exp.suggestNextMonth) {
    if (c?.metadata?.suggestNextMonth) return { ok: true };
    return { ok: false, why: `metadata.suggestNextMonth missing (${JSON.stringify(c?.metadata)})` };
  }
  return { ok: false, why: 'unhandled expectation' };
}

const results = [];
for (const c of CASES) {
  const today = c.today ?? DEFAULT_TODAY;
  const ref = new Date(`${today}T12:00:00Z`);
  let res;
  try {
    res = parser.parse(c.input, { reference: ref, timezone: 'Europe/Kyiv' });
  } catch (e) {
    results.push({ id: c.id, ok: false, why: `parser threw: ${e.message}`, cand: null, input: c.input });
    continue;
  }
  const best = pickBest(res);
  const verdict = evaluate(best?.cand, c.expect);
  results.push({
    id: c.id,
    input: c.input,
    today,
    ok: verdict.ok,
    why: verdict.why,
    cand: best?.cand ?? null,
    matchText: best?.match?.text,
    nMatches: res.matches.length,
  });
}

const pass = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);

console.log(`PASS ${pass.length} / FAIL ${fail.length} / TOTAL ${results.length}\n`);

console.log('--- FAILURES ---');
for (const r of fail) {
  console.log(`[${r.id}]  "${r.input}"  (today=${r.today})`);
  console.log(`   why:    ${r.why}`);
  console.log(`   match:  ${r.matchText ?? '(no match)'}  (${r.nMatches} matches)`);
  if (r.cand) {
    const c = r.cand;
    console.log(`   cand:   type=${c.type} conf=${c.confidence} date=${c.date} start=${c.start} end=${c.end} nights=${c.nights} reason=${c.reason} metadata=${JSON.stringify(c.metadata ?? {})}`);
  }
  console.log('');
}
