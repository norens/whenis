import { describe, it, expect } from 'vitest';
import { runRules } from '../src/rule-engine';
import type { Rule } from '../src/plugin';
import type { Token } from '../src/tags';

const T = (text: string, tags: Token['tags'], start = 0, end?: number): Token => ({
  text,
  start,
  end: end ?? start + text.length,
  tags,
});

describe('runRules', () => {
  it('returns IR spans for matched patterns', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
      T('днів', [{ kind: 'TimeUnit', unit: 'day' }], 2, 6),
    ];
    const numeralTimeUnit: Rule = {
      name: 'numeral+timeunit',
      pattern: [{ kind: 'tag', tag: 'Numeral' }, { kind: 'tag', tag: 'TimeUnit' }],
      produce: (matched) => {
        const n = matched[0] as Token;
        const u = matched[1] as Token;
        const numeral = n.tags.find(t => t.kind === 'Numeral');
        const unit = u.tags.find(t => t.kind === 'TimeUnit');
        if (!numeral || numeral.kind !== 'Numeral') return null;
        if (!unit || unit.kind !== 'TimeUnit') return null;
        return { type: 'duration', days: numeral.value };
      },
    };
    const result = runRules(tokens, [numeralTimeUnit]);
    expect(result).toHaveLength(1);
    expect(result[0]!.node).toEqual({ type: 'duration', days: 5 });
    expect(result[0]!.start).toBe(0);
    expect(result[0]!.end).toBe(6);
  });

  it('higher-priority rule fires first', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
    ];
    const lowPrio: Rule = {
      name: 'lo',
      priority: 0,
      pattern: [{ kind: 'tag', tag: 'Numeral' }],
      produce: () => ({ type: 'duration', days: 999 }),
    };
    const highPrio: Rule = {
      name: 'hi',
      priority: 10,
      pattern: [{ kind: 'tag', tag: 'Numeral' }],
      produce: () => ({ type: 'duration', days: 1 }),
    };
    const result = runRules(tokens, [lowPrio, highPrio]);
    expect((result[0]!.node as any).days).toBe(1);
  });

  it('iterates until fixpoint (rule can match emitted IR node)', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
      T('днів', [{ kind: 'TimeUnit', unit: 'day' }], 2, 6),
    ];
    const numeralTimeUnit: Rule = {
      name: 'first',
      pattern: [{ kind: 'tag', tag: 'Numeral' }, { kind: 'tag', tag: 'TimeUnit' }],
      produce: () => ({ type: 'duration', days: 5 }),
    };
    const wrapDuration: Rule = {
      name: 'second',
      pattern: [{ kind: 'node', node: 'duration' }],
      produce: () => ({ type: 'window', from: { type: 'absolute' }, to: { type: 'absolute' } }),
    };
    const result = runRules(tokens, [numeralTimeUnit, wrapDuration]);
    expect(result).toHaveLength(1);
    expect(result[0]!.node.type).toBe('window');
  });

  it('returns empty when no rules match', () => {
    const tokens: Token[] = [T('hello', [{ kind: 'Literal', text: 'hello' }])];
    expect(runRules(tokens, [])).toEqual([]);
  });
});
