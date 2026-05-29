import type { Rule, Token } from '@whenis/core';

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

export const todayRule: Rule = {
  name: 'en-today',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__today__') }],
  produce: () => ({ type: 'relative', offset: { days: 0 }, direction: 'this' }),
};

export const tomorrowRule: Rule = {
  name: 'en-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'future' }),
};

export const yesterdayRule: Rule = {
  name: 'en-yesterday',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__yesterday__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'past' }),
};

export const nextWeekdayRule: Rule = {
  name: 'en-next-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'next' };
  },
};

export const thisWeekdayRule: Rule = {
  name: 'en-this-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'this' };
  },
};

export const thisWeekendRule: Rule = {
  name: 'en-this-weekend',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__weekend__') },
  ],
  produce: () => {
    const sat = { type: 'weekday' as const, weekday: 6, modifier: 'this' as const };
    return {
      type: 'range',
      start: sat,
      end:   { type: 'offset_from' as const, base: sat, days: 1 },
      convention: 'checkout',
    };
  },
};

export const nextWeekendRule: Rule = {
  name: 'en-next-weekend',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__weekend__') },
  ],
  produce: () => {
    const sat = { type: 'weekday' as const, weekday: 6, modifier: 'next' as const };
    return {
      type: 'range',
      start: sat,
      end:   { type: 'offset_from' as const, base: sat, days: 1 },
      convention: 'checkout',
    };
  },
};

export const lastWeekendRule: Rule = {
  name: 'en-last-weekend',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'last') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__weekend__') },
  ],
  produce: () => {
    const sat = { type: 'weekday' as const, weekday: 6, modifier: 'last' as const };
    return {
      type: 'range',
      start: sat,
      end:   { type: 'offset_from' as const, base: sat, days: 1 },
      convention: 'checkout',
    };
  },
};

export const enRules: Rule[] = [todayRule, tomorrowRule, yesterdayRule, nextWeekdayRule, thisWeekdayRule, thisWeekendRule, nextWeekendRule, lastWeekendRule];
