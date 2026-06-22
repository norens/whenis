import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver';
import type { IRNode } from '../src/ir';
import type { ResolverCtx } from '../src/plugin';

const REF = new Date('2026-05-28T00:00:00.000+02:00'); // Thursday, Europe/Kyiv
const CTX: ResolverCtx = { reference: REF, timezone: 'Europe/Kyiv', preferFuture: true };

describe('resolve', () => {
  it('absolute date → single candidate, confidence 1', () => {
    const ir: IRNode = { type: 'absolute', year: 2026, month: 6, day: 5 };
    const out = resolve(ir, CTX);
    expect(out).toEqual([
      { confidence: 1, type: 'date', date: '2026-06-05', granularity: 'day' },
    ]);
  });

  it('weekday(modifier=next) → next ISO week weekday', () => {
    // Thu 2026-05-28; next ISO week Friday = 2026-06-05
    const ir: IRNode = { type: 'weekday', weekday: 5, modifier: 'next' };
    const out = resolve(ir, CTX);
    expect(out[0]!.date).toBe('2026-06-05');
    expect(out[0]!.confidence).toBe(1);
  });

  it('weekday(modifier=this) past in this week → both candidates with mixed confidence', () => {
    // Thu 2026-05-28; this Monday 2026-05-25 (past)
    const ir: IRNode = { type: 'weekday', weekday: 1, modifier: 'this' };
    const out = resolve(ir, CTX);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.some(c => c.date === '2026-05-25')).toBe(true);
    expect(out.some(c => c.date === '2026-06-01')).toBe(true);
  });

  it('range(checkout convention) → nights = end - start', () => {
    const ir: IRNode = {
      type: 'range',
      start: { type: 'absolute', year: 2026, month: 6, day: 5 },
      end: { type: 'absolute', year: 2026, month: 6, day: 10 },
      convention: 'checkout',
    };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({
      confidence: 1,
      type: 'range',
      start: '2026-06-05',
      end: '2026-06-10',
      nights: 5,
    });
  });

  it('range(inclusive convention) → checkout = end + 1, nights = end - start + 1', () => {
    const ir: IRNode = {
      type: 'range',
      start: { type: 'absolute', year: 2026, month: 6, day: 5 },
      end: { type: 'absolute', year: 2026, month: 6, day: 10 },
      convention: 'inclusive',
    };
    const out = resolve(ir, CTX);
    expect(out[0]!.end).toBe('2026-06-11');
    expect(out[0]!.nights).toBe(6);
  });

  it('window → start + end emitted', () => {
    const ir: IRNode = {
      type: 'window',
      from: { type: 'absolute', year: 2026, month: 5, day: 28 },
      to: { type: 'absolute', year: 2026, month: 6, day: 3 },
    };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({
      confidence: 1,
      type: 'window',
      start: '2026-05-28',
      end: '2026-06-03',
    });
  });

  it('duration → nights field only', () => {
    const ir: IRNode = { type: 'duration', nights: 3 };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({ confidence: 1, type: 'duration', nights: 3 });
  });

  it('fuzzy → single low-confidence candidate', () => {
    const ir: IRNode = {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'absolute', month: 5 },
      reason: 'sometime_in_month',
    };
    const out = resolve(ir, CTX);
    expect(out[0]!.type).toBe('fuzzy');
    expect(out[0]!.confidence).toBeLessThan(0.5);
    expect(out[0]!.reason).toBe('sometime_in_month');
  });

  it('unresolved → confidence-0 fuzzy candidate', () => {
    const ir: IRNode = { type: 'unresolved', reason: 'unsupported_pattern' };
    const out = resolve(ir, CTX);
    expect(out).toHaveLength(1);
    expect(out[0]!.confidence).toBe(0);
    expect(out[0]!.reason).toBe('unsupported_pattern');
  });
});

const ctx = (iso: string) => ({ reference: new Date(`${iso}T12:00:00`), timezone: 'Europe/Kyiv' });

describe('first_weekday_in_month', () => {
  it('first Saturday of August 2026 is 2026-08-01', () => {
    const r = resolve({ type: 'first_weekday_in_month', weekday: 6, month: 8 }, ctx('2026-06-22'));
    expect(r[0]).toMatchObject({ type: 'date', date: '2026-08-01' });
  });
  it('first Saturday of July 2026 is 2026-07-04', () => {
    const r = resolve({ type: 'first_weekday_in_month', weekday: 6, month: 7 }, ctx('2026-06-22'));
    expect(r[0]).toMatchObject({ type: 'date', date: '2026-07-04' });
  });
  it('defaults to the reference month when month omitted', () => {
    const r = resolve({ type: 'first_weekday_in_month', weekday: 6 }, ctx('2026-06-22'));
    expect(r[0]).toMatchObject({ type: 'date', date: '2026-06-06' });
  });
});
