import type { Rule, Token } from '@whenis/core';

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

export const ukTodayRule: Rule = {
  name: 'uk-today',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__today__') }],
  produce: () => ({ type: 'relative', offset: { days: 0 }, direction: 'this' }),
};

export const ukTomorrowRule: Rule = {
  name: 'uk-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'future' }),
};

export const ukYesterdayRule: Rule = {
  name: 'uk-yesterday',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__yesterday__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'past' }),
};

export const ukDayAfterTomorrowRule: Rule = {
  name: 'uk-day-after-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__day_after_tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 2 }, direction: 'future' }),
};

export const ukNextWeekdayRule: Rule = {
  name: 'uk-next-weekday',
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

export const ukThisWeekdayRule: Rule = {
  name: 'uk-this-weekday',
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

export const ukThroughNRule: Rule = {
  name: 'uk-through-n',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'in') },
    { kind: 'tag', tag: 'Numeral', optional: true },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const numTok = matched[1] as Token | null;
    const u = (matched[2] as Token).tags.find(t => t.kind === 'TimeUnit');
    if (!u || u.kind !== 'TimeUnit') return null;
    const n = numTok?.tags.find(t => t.kind === 'Numeral');
    const value = n && n.kind === 'Numeral' ? n.value : 1;
    switch (u.unit) {
      case 'day':   return { type: 'relative', offset: { days: value },   direction: 'future' };
      case 'week':  return { type: 'relative', offset: { weeks: value },  direction: 'future' };
      case 'month': return { type: 'relative', offset: { months: value }, direction: 'future' };
      default:      return null;
    }
  },
};

export const ukDayMonthRule: Rule = {
  name: 'uk-day-month',
  priority: 60,
  pattern: [
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const n = (matched[0] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[1] as Token).tags.find(t => t.kind === 'MonthName');
    if (!n || n.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    if (n.value < 1 || n.value > 31) return null;
    return { type: 'absolute', month: m.month, day: n.value };
  },
};

export const ukRangeUntilRule: Rule = {
  name: 'uk-range-until',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'from') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'to') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const a = (matched[1] as Token).tags.find(t => t.kind === 'Numeral');
    const b = (matched[3] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[4] as Token).tags.find(t => t.kind === 'MonthName');
    if (!a || a.kind !== 'Numeral' || !b || b.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    return {
      type: 'range',
      start: { type: 'absolute', month: m.month, day: a.value },
      end: { type: 'absolute', month: m.month, day: b.value },
      convention: 'checkout',
    };
  },
};

export const ukRangeThroughRule: Rule = {
  name: 'uk-range-through',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'from') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'through') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const a = (matched[1] as Token).tags.find(t => t.kind === 'Numeral');
    const b = (matched[3] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[4] as Token).tags.find(t => t.kind === 'MonthName');
    if (!a || a.kind !== 'Numeral' || !b || b.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    return {
      type: 'range',
      start: { type: 'absolute', month: m.month, day: a.value },
      end: { type: 'absolute', month: m.month, day: b.value },
      convention: 'inclusive',
    };
  },
};

export const ukRules: Rule[] = [
  ukTodayRule, ukTomorrowRule, ukYesterdayRule, ukDayAfterTomorrowRule,
  ukNextWeekdayRule, ukThisWeekdayRule,
  ukThroughNRule,
  ukRangeUntilRule, ukRangeThroughRule,
  ukDayMonthRule,
];
