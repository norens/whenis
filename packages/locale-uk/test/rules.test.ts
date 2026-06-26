import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { uk } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z'); // Thursday

describe('locale-uk rules', () => {
  const parser = createParser({ locales: [uk] });

  it("'наступної п'ятниці' → next ISO week's Friday", () => {
    const r = parser.parse("наступної п'ятниці", { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it("'наступний понеділок' → next ISO week's Monday", () => {
    const r = parser.parse('наступний понеділок', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-01');
  });

  it("'цю п'ятницю' (future within this week) → resolved", () => {
    const r = parser.parse("цю п'ятницю", { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it("'сьогодні' → reference date", () => {
    const r = parser.parse('сьогодні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-28');
  });

  it("'завтра' → ref + 1", () => {
    const r = parser.parse('завтра', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it("'через 3 дні' → ref + 3", () => {
    const r = parser.parse('через 3 дні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-31');
  });

  it("'5 червня' → 2026-06-05", () => {
    const r = parser.parse('5 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it("'з 5 до 10 червня' → range, checkout convention, nights=5", () => {
    const r = parser.parse('з 5 до 10 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-05', end: '2026-06-10', nights: 5 })
    );
  });

  it("'з 5 по 10 червня' → range, last-night convention, nights=6", () => {
    const r = parser.parse('з 5 по 10 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-05', end: '2026-06-11', nights: 6 })
    );
  });
});

describe('locale-uk rules — day range with single month (GAP-22)', () => {
  const parser = createParser({ locales: [uk] });

  it("'22-25.06' → range Jun 22 to Jun 25", () => {
    const r = parser.parse('22-25.06', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-22', end: '2026-06-25' })
    );
  });

  it("'22 - 25.06' (spaces around dash) → same range", () => {
    const r = parser.parse('22 - 25.06', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-22', end: '2026-06-25' })
    );
  });

  it("'22-25 червня' → range Jun 22 to Jun 25", () => {
    const r = parser.parse('22-25 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-22', end: '2026-06-25' })
    );
  });

  it("'22 - 25 червня' (spaces around dash) → same range", () => {
    const r = parser.parse('22 - 25 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-22', end: '2026-06-25' })
    );
  });

  it("'22–25 червня' (en dash) → same range", () => {
    const r = parser.parse('22–25 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-22', end: '2026-06-25' })
    );
  });

  it("'1-3 травня' already past → rolls to next year", () => {
    const r = parser.parse('1-3 травня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2027-05-01', end: '2027-05-03' })
    );
  });

  it("'25-22.06' reversed days → no range candidate", () => {
    const r = parser.parse('25-22.06', { reference: REF, timezone: 'UTC' });
    const cand = r.matches[0]?.candidates[0];
    expect(cand?.type === 'range').toBe(false);
  });

  it("'на 2 - 3 ночі' still parses as nights, not a day range", () => {
    const r = parser.parse('на 2 - 3 ночі', { reference: REF, timezone: 'UTC' });
    const cand = r.matches[0]?.candidates[0];
    expect(cand?.type === 'range').toBe(false);
  });
});

// Day range where both endpoints carry their own month (name or DD.MM), not covered by the
// single-month range rules.
describe('locale-uk rules — day range with month on both sides', () => {
  const parser = createParser({ locales: [uk] });
  const top = (s: string) => parser.parse(s, { reference: REF, timezone: 'UTC' }).matches[0]?.candidates[0];

  it("'з 26 липня по 28 липня' → inclusive, nights=3 (same as 'з 26 по 28 липня')", () => {
    expect(top('з 26 липня по 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-29', nights: 3 })
    );
  });

  it("'26 липня по 28 липня' (no leading 'з') → inclusive, nights=3", () => {
    expect(top('26 липня по 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-29', nights: 3 })
    );
  });

  it("'з 26 липня до 28 липня' → checkout convention, nights=2", () => {
    expect(top('з 26 липня до 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-28', nights: 2 })
    );
  });

  it("'26 липня - 28 липня' (spaced dash) → checkout convention, nights=2", () => {
    expect(top('26 липня - 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-28', nights: 2 })
    );
  });

  it("'26 липня – 28 липня' (en dash) → same range", () => {
    expect(top('26 липня – 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-28', nights: 2 })
    );
  });

  it("'30 липня по 2 серпня' (cross-month) → inclusive, nights=4", () => {
    expect(top('30 липня по 2 серпня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-30', end: '2026-08-03', nights: 4 })
    );
  });

  it("'з 26.07 по 28.07' (DD.MM both sides) → inclusive, nights=3", () => {
    expect(top('з 26.07 по 28.07')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-29', nights: 3 })
    );
  });

  it("'28 грудня по 3 січня' (cross-year wrap) → end rolls to next year", () => {
    expect(top('28 грудня по 3 січня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-12-28', end: '2027-01-04', nights: 7 })
    );
  });

  it("'28 липня по 26 липня' (same-month reversed) → not a range (typo guard)", () => {
    expect(top('28 липня по 26 липня')?.type === 'range').toBe(false);
  });

  // Regression: single-month forms must keep resolving exactly as before.
  it("'з 26 по 28 липня' (month once) still inclusive nights=3", () => {
    expect(top('з 26 по 28 липня')).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-07-26', end: '2026-07-29', nights: 3 })
    );
  });
});
