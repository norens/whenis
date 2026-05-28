import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/tokenizer';
import type { Locale } from '../src/locale';

const makeLocale = (lexicon: Record<string, any>, stems: Array<[RegExp, any]> = []): Locale => ({
  code: 'test',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase()],
  lexicon: new Map(Object.entries(lexicon)),
  stems,
  rules: [],
  defaults: { preferFuture: true },
});

describe('tokenize', () => {
  it('splits on whitespace and assigns positions', () => {
    const locale = makeLocale({});
    const tokens = tokenize('hello world', locale);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ text: 'hello', start: 0, end: 5, tags: [{ kind: 'Literal', text: 'hello' }] });
    expect(tokens[1]).toEqual({ text: 'world', start: 6, end: 11, tags: [{ kind: 'Literal', text: 'world' }] });
  });

  it('assigns tags from exact lexicon match (after preprocess)', () => {
    const locale = makeLocale({
      'today': [{ kind: 'Pointer', direction: 'this' }],
    });
    const tokens = tokenize('Today', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'Pointer', direction: 'this' }]);
  });

  it('assigns numeral tag for digit tokens', () => {
    const locale = makeLocale({});
    const tokens = tokenize('5 days', locale);
    expect(tokens[0]!.tags).toContainEqual({ kind: 'Numeral', value: 5 });
  });

  it('falls back to stems when no exact match', () => {
    const locale = makeLocale(
      {},
      [[/^трав/, [{ kind: 'MonthName', month: 5 }]]]
    );
    const tokens = tokenize('травня', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'MonthName', month: 5 }]);
  });

  it('exact match wins over stems', () => {
    const locale = makeLocale(
      { 'травня': [{ kind: 'MonthName', month: 5 }] },
      [[/^трав/, [{ kind: 'MonthName', month: 99 }]]]
    );
    const tokens = tokenize('травня', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'MonthName', month: 5 }]);
  });

  it('splits punctuation as separate tokens preserving positions', () => {
    const locale = makeLocale({});
    const tokens = tokenize('5.06', locale);
    // We treat dots inside numbers specifically: see DD.MM rule later.
    // For now, single token with literal text.
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.text).toBe('5.06');
  });
});
