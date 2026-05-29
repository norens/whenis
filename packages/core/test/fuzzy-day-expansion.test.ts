import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver';
import type { IRNode } from '../src/ir';

const ctx = { reference: new Date('2026-04-29T12:00:00Z'), timezone: 'Europe/Kyiv', preferFuture: true };

describe("resolver: fuzzy { granularity: 'day' } expands to two candidates", () => {
  it('absolute inner → literal date (low conf) + fuzzy(0)', () => {
    const node: IRNode = {
      type: 'fuzzy',
      granularity: 'day',
      ref: { type: 'absolute', year: 2026, month: 6, day: 5 },
      reason: 'vague_qualified',
    };
    const candidates = resolve(node, ctx);
    expect(candidates).toHaveLength(2);
    const [literal, fuzzy] = candidates;
    expect(literal?.type).toBe('date');
    expect(literal?.date).toBe('2026-06-05');
    expect(literal?.confidence).toBeCloseTo(0.4);
    expect(literal?.reason).toBe('vague_qualified');
    expect(fuzzy?.type).toBe('fuzzy');
    expect(fuzzy?.confidence).toBe(0);
    expect(fuzzy?.reason).toBe('vague_qualified');
  });
});

describe("resolver: fuzzy { granularity: 'month' } now exposes ref", () => {
  it("absolute ref with month=5 → candidate.ref = { month: 5 }", () => {
    const node: IRNode = {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'absolute', month: 5 },
      reason: 'vague_month',
    };
    const [c] = resolve(node, ctx);
    expect(c?.ref).toEqual({ month: 5 });
  });

  it("absolute ref with month=5 and year=2027 → candidate.ref = { month: 5, year: 2027 }", () => {
    const node: IRNode = {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'absolute', month: 5, year: 2027 },
      reason: 'vague_month',
    };
    const [c] = resolve(node, ctx);
    expect(c?.ref).toEqual({ month: 5, year: 2027 });
  });

  it("non-absolute ref → candidate.ref is undefined", () => {
    const node: IRNode = {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'unresolved', reason: 'no-month' },
      reason: 'vague_month',
    };
    const [c] = resolve(node, ctx);
    expect(c?.ref).toBeUndefined();
  });
});
