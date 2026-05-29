import { describe, it, expect } from 'vitest';
import type { Locale, Tag } from '../src';
import { mergeLocales } from '../src/merge-locales';

function makeLocale(code: string, lex: Array<[string, Tag[]]>, opts: Partial<Locale> = {}): Locale {
  return {
    code,
    dateOrder: 'DMY',
    weekStart: 'mon',
    preprocess: opts.preprocess ?? [],
    lexicon: new Map(lex),
    stems: opts.stems ?? [],
    rules: opts.rules ?? [],
    defaults: opts.defaults ?? { preferFuture: true },
    ...opts,
  };
}

describe('mergeLocales', () => {
  it('returns the same Locale when given a single one', () => {
    const uk = makeLocale('uk', [['сьогодні', [{ kind: 'Pointer', direction: 'this' }]]]);
    expect(mergeLocales([uk])).toBe(uk);
  });

  it('throws on empty array', () => {
    expect(() => mergeLocales([])).toThrow(/at least one locale/);
  });

  it('unions lexicons; first locale wins on collision', () => {
    const a = makeLocale('a', [['x', [{ kind: 'Literal', text: 'from-a' }]]]);
    const b = makeLocale('b', [
      ['x', [{ kind: 'Literal', text: 'from-b' }]],
      ['y', [{ kind: 'Literal', text: 'only-b' }]],
    ]);
    const merged = mergeLocales([a, b]);
    expect(merged.lexicon.get('x')).toEqual([{ kind: 'Literal', text: 'from-a' }]);
    expect(merged.lexicon.get('y')).toEqual([{ kind: 'Literal', text: 'only-b' }]);
  });

  it('attributes lexicon source to the contributing locale', () => {
    const a = makeLocale('uk', [['сьогодні', [{ kind: 'Pointer', direction: 'this' }]]]);
    const b = makeLocale('en', [['today', [{ kind: 'Pointer', direction: 'this' }]]]);
    const merged = mergeLocales([a, b]);
    expect(merged.lexiconSource?.get('сьогодні')).toBe('uk');
    expect(merged.lexiconSource?.get('today')).toBe('en');
  });

  it('concatenates stems in locale order and attributes source', () => {
    const a = makeLocale('a', [], { stems: [[/^foo/, [{ kind: 'Literal', text: 'a' }]]] });
    const b = makeLocale('b', [], { stems: [[/^bar/, [{ kind: 'Literal', text: 'b' }]]] });
    const merged = mergeLocales([a, b]);
    expect(merged.stems.length).toBe(2);
    expect(merged.stemSource).toEqual(['a', 'b']);
  });

  it('composes preprocess in locale order', () => {
    const calls: string[] = [];
    const a = makeLocale('a', [], { preprocess: [s => { calls.push('a'); return s; }] });
    const b = makeLocale('b', [], { preprocess: [s => { calls.push('b'); return s; }] });
    const merged = mergeLocales([a, b]);
    merged.preprocess.forEach(fn => fn('x'));
    expect(calls).toEqual(['a', 'b']);
  });

  it('unions skip sets', () => {
    const a = makeLocale('a', [], { skip: new Set(['р.']) });
    const b = makeLocale('b', [], { skip: new Set(['yr']) });
    const merged = mergeLocales([a, b]);
    expect(merged.skip).toEqual(new Set(['р.', 'yr']));
  });

  it('concatenates rules', () => {
    const r1 = { name: 'r1', priority: 10, pattern: [], apply: () => null };
    const r2 = { name: 'r2', priority: 5, pattern: [], apply: () => null };
    const a = makeLocale('a', [], { rules: [r1 as any] });
    const b = makeLocale('b', [], { rules: [r2 as any] });
    const merged = mergeLocales([a, b]);
    expect(merged.rules.map(r => r.name)).toEqual(['r1', 'r2']);
  });

  it('first locale wins for dateOrder, weekStart, defaults', () => {
    const a = makeLocale('a', [], { dateOrder: 'YMD', weekStart: 'sun', defaults: { preferFuture: false } });
    const b = makeLocale('b', [], { dateOrder: 'MDY' });
    const merged = mergeLocales([a, b]);
    expect(merged.dateOrder).toBe('YMD');
    expect(merged.weekStart).toBe('sun');
    expect(merged.defaults.preferFuture).toBe(false);
  });

  it("synthesizes merged code as 'a+b'", () => {
    const a = makeLocale('uk', []);
    const b = makeLocale('en', []);
    expect(mergeLocales([a, b]).code).toBe('uk+en');
  });
});
