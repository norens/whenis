// Integration smoke harness: 79 representative real-world inputs covering
// every IR shape (DD.MM, weekdays, weekend phrases, ranges, windows, durations,
// vague markers, holiday refs) parsed through the full UA + EN + booking stack.
// Reference anchor = 2026-04-29 (Wed), tz = Europe/Kyiv.
// Mirrored as a standalone runner in scripts/smoke-corpus.mjs; keep both in sync.

import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { en } from '@whenis/locale-en';
import { booking } from '../src/index';

const parser = createParser({ locales: [uk, en], plugins: [booking] });
const DEFAULT_TODAY = '2026-04-29';

interface Expect {
  date?: string;
  end?: string;
  nights?: number;
  window?: { from: string; to: string };
  reason?: string;
  unresolved?: boolean;
  dateNull?: boolean;
  noWeekday?: boolean;
  suggestNextMonth?: boolean;
}
interface Case {
  id: string;
  input: string;
  today?: string;
  expect: Expect;
}

const CASES: Case[] = [
  // DD.MM family (GAP-2)
  { id: 'dd-mm/range', input: '12.06-22.06', expect: { date: '2026-06-12', end: '2026-06-22' } },
  { id: 'dd-mm/range-spaces', input: '12.06 - 22.06', expect: { date: '2026-06-12', end: '2026-06-22' } },
  { id: 'dd-mm/range-current-yr', input: '01.05-03.05', expect: { date: '2026-05-01', end: '2026-05-03' } },
  { id: 'dd-mm/past-rolls', input: '15.04', today: '2026-04-29', expect: { date: '2027-04-15' } },
  { id: 'dd-mm/future-stays', input: '15.07', expect: { date: '2026-07-15' } },
  { id: 'dd-mm/full-yyyy', input: '12.06.2025', expect: { date: '2025-06-12' } },
  { id: 'dd-mm/invalid', input: '40.13', expect: { unresolved: true } },

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
  // "цей понеділок" from Wednesday: Monday has already passed this week.
  // whenis emits next Monday (2026-05-04) with reason=this_week_past_fallback_next.
  { id: 'wd/this-monday-from-wed-past', input: 'цей понеділок', expect: { reason: 'this_week_past_fallback_next' } },

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
  // metadata key is suggest_next_month (snake_case) per enricher implementation
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

  // Day range with single month (GAP-22)
  { id: 'gap22/dd-dd.mm', input: '22-25.06', expect: { date: '2026-06-22', end: '2026-06-25' } },
  { id: 'gap22/dd-dd-month', input: '22-25 червня', expect: { date: '2026-06-22', end: '2026-06-25' } },
  { id: 'gap22/spaced-dot', input: '22 - 25.06', expect: { date: '2026-06-22', end: '2026-06-25' } },
  { id: 'gap22/spaced-month', input: '22 - 25 червня', expect: { date: '2026-06-22', end: '2026-06-25' } },
  { id: 'gap22/past-rolls', input: '1-3 квітня', expect: { date: '2027-04-01', end: '2027-04-03' } },
];

function pickBest(parseResult: ReturnType<typeof parser.parse>) {
  if (!parseResult.matches.length) return null;
  const m = parseResult.matches.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  return { match: m, cand: m.candidates[0] ?? null };
}

describe('integration smoke — 79 real-world inputs through UA+EN+booking', () => {
  for (const c of CASES) {
    it(`[${c.id}] "${c.input}"`, () => {
      const ref = new Date(`${c.today ?? DEFAULT_TODAY}T12:00:00Z`);
      const result = parser.parse(c.input, { reference: ref, timezone: 'Europe/Kyiv' });
      const best = pickBest(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cand: any = best?.cand;
      const exp = c.expect;

      if (exp.unresolved) {
        if (!cand || cand.confidence === 0 || cand.type === 'fuzzy' || (cand.reason && cand.reason !== 'past_date')) return;
        throw new Error(`expected unresolved, got ${cand.type} ${cand.date ?? cand.start ?? ''}`);
      }
      if (exp.reason) {
        const r = cand?.reason ?? cand?.metadata?.reason;
        expect(r).toBe(exp.reason);
        return;
      }
      if (exp.dateNull && exp.nights !== undefined) {
        expect(cand?.nights).toBe(exp.nights);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(cand?.date).toBeFalsy();
        return;
      }
      if (exp.window) {
        expect(cand?.type).toBe('window');
        expect(cand?.start).toBe(exp.window.from);
        expect(cand?.end).toBe(exp.window.to);
        return;
      }
      if (exp.noWeekday) {
        if (!cand) return;
        expect(cand.type).not.toBe('date');
        return;
      }
      if (exp.date && exp.end) {
        const start = cand?.start ?? cand?.date;
        expect(start).toBe(exp.date);
        expect(cand?.end).toBe(exp.end);
        if (exp.nights !== undefined) expect(cand?.nights).toBe(exp.nights);
        return;
      }
      if (exp.date) {
        const start = cand?.date ?? cand?.start;
        expect(start).toBe(exp.date);
        return;
      }
      if (exp.suggestNextMonth) {
        // enricher sets metadata.suggest_next_month (snake_case)
        expect(cand?.metadata?.suggest_next_month).toBe(true);
        return;
      }
      throw new Error(`unhandled expectation for ${c.id}`);
    });
  }
});
