import { describe, it, expect } from 'vitest';
import type { Locale } from '../src/locale';
import type { Plugin, Rule } from '../src/plugin';

describe('interfaces smoke', () => {
  it('Locale shape compiles', () => {
    const stub: Locale = {
      code: 'xx',
      dateOrder: 'DMY',
      weekStart: 'mon',
      preprocess: [],
      lexicon: new Map(),
      stems: [],
      rules: [],
      defaults: { preferFuture: true },
    };
    expect(stub.code).toBe('xx');
  });

  it('Plugin shape compiles', () => {
    const p: Plugin = {
      name: '@test/plugin',
      rules: [],
    };
    expect(p.name).toBe('@test/plugin');
  });

  it('Rule shape compiles', () => {
    const r: Rule = {
      name: 'noop',
      pattern: [],
      produce: () => null,
    };
    expect(r.name).toBe('noop');
  });
});
