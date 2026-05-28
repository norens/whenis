import { describe, it, expect } from 'vitest';
import type { Tag, Token } from '../src/tags';
import type { IRNode } from '../src/ir';
import type { ResolvedDate } from '../src/types';

describe('types smoke', () => {
  it('Tag discriminated union narrows correctly', () => {
    const t: Tag = { kind: 'Numeral', value: 7 };
    if (t.kind === 'Numeral') {
      expect(t.value).toBe(7);
    }
  });

  it('IRNode discriminated union narrows', () => {
    const n: IRNode = { type: 'duration', nights: 3 };
    if (n.type === 'duration') {
      expect(n.nights).toBe(3);
    }
  });

  it('ResolvedDate optional fields are typed', () => {
    const r: ResolvedDate = { confidence: 1, type: 'date', date: '2026-05-29' };
    expect(r.date).toBe('2026-05-29');
  });
});
