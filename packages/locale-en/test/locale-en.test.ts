import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { en } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z'); // Thursday

describe('locale-en', () => {
  const parser = createParser({ locales: [en] });

  it('today', () => {
    const r = parser.parse('today', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-28');
  });

  it('tomorrow', () => {
    const r = parser.parse('tomorrow', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it('yesterday', () => {
    const r = parser.parse('yesterday', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-27');
  });

  it('next Friday', () => {
    const r = parser.parse('next friday', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it('this Monday (already past) → multi-candidate', () => {
    const r = parser.parse('this monday', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('3 days → duration', () => {
    const r = parser.parse('3 days', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.type).toBe('duration');
    expect(r.matches[0]!.candidates[0]!.nights).toBe(3);
  });
});
