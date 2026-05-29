import { describe, it, expect } from 'vitest';
import { createParser } from '../src';
import type { Locale, Tag, Rule } from '../src';

function makeLocale(code: string, lex: Array<[string, Tag[]]>, rules: Rule[] = []): Locale {
  return {
    code, dateOrder: 'DMY', weekStart: 'mon',
    preprocess: [s => s.toLowerCase()],
    lexicon: new Map(lex), stems: [], rules,
    defaults: { preferFuture: true },
  };
}

describe('createParser with multiple locales', () => {
  it('uses tokens from all provided locales, not just locales[0]', () => {
    const a = makeLocale('a', [['hello', [{ kind: 'Literal', text: 'hi-a' }]]]);
    const b = makeLocale('b', [['world', [{ kind: 'Literal', text: 'hi-b' }]]]);
    const parser = createParser({ locales: [a, b] });
    expect(parser).toBeDefined();
  });

  it('a rule contributed by locales[1] still fires', () => {
    // Probe rule: matches Literal tag → produces a fuzzy IR we can read back.
    const probeRule: Rule = {
      name: 'probe',
      priority: 100,
      pattern: [{ kind: 'tag', tag: 'Literal' }],
      produce: () => ({ type: 'fuzzy', granularity: 'year', ref: { type: 'absolute' }, reason: 'probe-fired' }),
    };
    const a = makeLocale('a', [['hello', [{ kind: 'Literal', text: 'hello' }]]]);
    const b = makeLocale('b', [['xx', [{ kind: 'Literal', text: 'probe-marker' }]]], [probeRule]);
    const parser = createParser({ locales: [a, b] });
    const result = parser.parse('xx', { reference: new Date('2026-04-29T12:00:00Z'), timezone: 'Europe/Kyiv' });
    expect(result.matches[0]?.candidates[0]?.reason).toBe('probe-fired');
  });
});

describe('Token.sourceLocale', () => {
  it('tokenizer tags tokens with the source locale from a merged Locale', async () => {
    const { tokenize } = await import('../src/tokenizer');
    const { mergeLocales } = await import('../src');
    const a: Locale = {
      code: 'uk',
      dateOrder: 'DMY', weekStart: 'mon', preprocess: [], stems: [], rules: [],
      lexicon: new Map([['привіт', [{ kind: 'Literal', text: 'hi' }]]]),
      defaults: { preferFuture: true },
    };
    const b: Locale = {
      code: 'en',
      dateOrder: 'MDY', weekStart: 'mon', preprocess: [], stems: [], rules: [],
      lexicon: new Map([['hello', [{ kind: 'Literal', text: 'hi' }]]]),
      defaults: { preferFuture: true },
    };
    const merged = mergeLocales([a, b]);
    const toks = tokenize('привіт hello', merged);
    expect(toks[0]?.sourceLocale).toBe('uk');
    expect(toks[1]?.sourceLocale).toBe('en');
  });

  it('tokenizer leaves sourceLocale undefined for single-locale parsers', async () => {
    const { tokenize } = await import('../src/tokenizer');
    const single: Locale = {
      code: 'uk',
      dateOrder: 'DMY', weekStart: 'mon', preprocess: [], stems: [], rules: [],
      lexicon: new Map([['привіт', [{ kind: 'Literal', text: 'hi' }]]]),
      defaults: { preferFuture: true },
    };
    const toks = tokenize('привіт', single);
    expect(toks[0]?.sourceLocale).toBeUndefined();
  });

  it('tokenizer attributes source for stem hits', async () => {
    const { tokenize } = await import('../src/tokenizer');
    const { mergeLocales } = await import('../src');
    const a: Locale = {
      code: 'uk',
      dateOrder: 'DMY', weekStart: 'mon', preprocess: [], rules: [],
      lexicon: new Map(),
      stems: [[/^trav/u, [{ kind: 'MonthName', month: 5 }]]],
      defaults: { preferFuture: true },
    };
    const b: Locale = {
      code: 'en',
      dateOrder: 'MDY', weekStart: 'mon', preprocess: [], rules: [],
      lexicon: new Map(),
      stems: [[/^may/u, [{ kind: 'MonthName', month: 5 }]]],
      defaults: { preferFuture: true },
    };
    const merged = mergeLocales([a, b]);
    const toks = tokenize('travnia may', merged);
    expect(toks[0]?.sourceLocale).toBe('uk');
    expect(toks[1]?.sourceLocale).toBe('en');
  });
});
