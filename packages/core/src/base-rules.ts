import type { Rule } from './plugin';
import type { Token } from './tags';
import type { IRNode } from './ir';

/** ISO YYYY-MM-DD passthrough. */
export const isoDateRule: Rule = {
  name: 'iso-date',
  priority: 100,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => /^\d{4}-\d{2}-\d{2}$/.test(t.text) }],
  produce: (matched) => {
    const t = matched[0] as Token;
    const m = t.text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { type: 'absolute', year: +m[1]!, month: +m[2]!, day: +m[3]! };
  },
};

/** Numeral + TimeUnit → duration (day=nights, week=days*7). */
export const numeralTimeUnitRule: Rule = {
  name: 'numeral-timeunit',
  priority: 50,
  pattern: [
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = (matched[0] as Token).tags.find(t => t.kind === 'Numeral');
    const u = (matched[1] as Token).tags.find(t => t.kind === 'TimeUnit');
    if (!n || n.kind !== 'Numeral') return null;
    if (!u || u.kind !== 'TimeUnit') return null;
    switch (u.unit) {
      case 'night':
      case 'day':  return { type: 'duration', nights: n.value };
      case 'week': return { type: 'duration', nights: n.value * 7 };
      default:     return null;
    }
  },
};

/** <date|weekday|range> + VagueMarker → fuzzy{granularity:'day'} */
export const vagueQualifiedRule: Rule = {
  name: 'base:vague-qualified',
  // Lower priority so concrete date/weekday rules emit their IR first; this rule then wraps it.
  priority: -10,
  pattern: [
    { kind: 'node', nodes: ['absolute', 'weekday', 'range'] },
    { kind: 'tag',  tag:  'VagueMarker' },
  ],
  produce: (matched) => {
    const inner = matched[0] as IRNode;
    return { type: 'fuzzy', granularity: 'day', ref: inner, reason: 'vague_qualified' };
  },
};

/** VagueMarker + <date|weekday|range> → fuzzy{granularity:'day'} */
export const vagueQualifiedPrefixRule: Rule = {
  name: 'base:vague-qualified-prefix',
  priority: -10,
  pattern: [
    { kind: 'tag',  tag:  'VagueMarker' },
    { kind: 'node', nodes: ['absolute', 'weekday', 'range'] },
  ],
  produce: (matched) => {
    const inner = matched[1] as IRNode;
    return { type: 'fuzzy', granularity: 'day', ref: inner, reason: 'vague_qualified' };
  },
};

export const baseRules: Rule[] = [isoDateRule, numeralTimeUnitRule, vagueQualifiedRule, vagueQualifiedPrefixRule];
