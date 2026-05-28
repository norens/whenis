import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z');

describe('@whenis/booking', () => {
  const parser = createParser({ locales: [uk], plugins: [booking] });

  it("'впродовж 7 днів' → window 7 days starting at reference", () => {
    const r = parser.parse('впродовж 7 днів', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'window', start: '2026-05-28', end: '2026-06-03' })
    );
  });

  it("'у найближчі 5 днів' → 5-day window", () => {
    const r = parser.parse('у найближчі 5 днів', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.start).toBe('2026-05-28');
    expect(r.matches[0]!.candidates[0]!.end).toBe('2026-06-01');
  });

  it("'на 5 ночей' → duration with nights=5 (no date)", () => {
    const r = parser.parse('на 5 ночей', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual({ confidence: 1, type: 'duration', nights: 5 });
  });

  it("'на 3 дні' → duration with nights=3", () => {
    const r = parser.parse('на 3 дні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.nights).toBe(3);
  });
});

describe('@whenis/booking — extended', () => {
  const parser = createParser({ locales: [uk], plugins: [booking] });
  const REF_NEAR_MONTH_END = new Date('2026-05-27T00:00:00.000Z'); // Wed, 4 days left in May

  it("'наступні вихідні' → range Sat+Sun next ISO week", () => {
    const r = parser.parse('наступні вихідні', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.start).toBe('2026-06-06');
    expect(r.matches[0]!.candidates[0]!.end).toBe('2026-06-07');
  });

  it("'після свят' → fuzzy with reason=holiday_ref", () => {
    const r = parser.parse('після свят', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.type).toBe('fuzzy');
    expect(r.matches[0]!.candidates[0]!.reason).toBe('holiday_ref');
  });

  it("mostly-past enricher does NOT add suggest_next_month to non-fuzzy candidates", () => {
    const r = parser.parse('завтра', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.metadata?.suggest_next_month).toBeUndefined();
  });
});
