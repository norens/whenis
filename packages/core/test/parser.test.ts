import { describe, it, expect } from 'vitest';
import { createParser } from '../src/index';
import type { Locale } from '../src/locale';

const minimalLocale: Locale = {
  code: 'min',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase()],
  lexicon: new Map([
    ['days', [{ kind: 'TimeUnit', unit: 'day' }]],
  ]),
  stems: [],
  rules: [],
  defaults: { preferFuture: true },
};

describe('createParser', () => {
  it('parses an ISO date with the base ISO rule', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('2026-06-05', { reference: new Date('2026-05-28T00:00:00Z') });
    expect(result.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
    expect(result.matches[0]!.text).toBe('2026-06-05');
  });

  it('Numeral + TimeUnit composes to duration', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('5 days', { reference: new Date('2026-05-28T00:00:00Z') });
    expect(result.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'duration', nights: 5 })
    );
  });

  it('empty input → empty matches', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('', { reference: new Date() });
    expect(result.matches).toHaveLength(0);
  });

  it('plugins contribute rules', () => {
    const parser = createParser({
      locales: [minimalLocale],
      plugins: [{
        name: 'test',
        rules: [{
          name: 'literal-hi',
          pattern: [{ kind: 'tag', tag: 'Literal' }],
          produce: () => ({ type: 'fuzzy', granularity: 'month', ref: { type: 'absolute' }, reason: 'literal_seen' }),
        }],
      }],
    });
    const result = parser.parse('hi', { reference: new Date() });
    expect(result.matches[0]!.candidates[0]!.reason).toBe('literal_seen');
  });
});
