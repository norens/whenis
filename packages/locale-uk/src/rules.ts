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

export const ukNearestWeekdayRule: Rule = {
  name: 'uk-nearest-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'nearest') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'nearest' };
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

// "до кінця тижня" / "до кінця місяця" → window from today to end-of-period
export const ukUntilEndOfRule: Rule = {
  name: 'uk-until-end-of',
  priority: 78,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'to') },
    { kind: 'tag', tag: 'Literal',   predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__end_of__') },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const u = (matched[2] as Token).tags.find(t => t.kind === 'TimeUnit');
    if (!u || u.kind !== 'TimeUnit') return null;
    if (u.unit !== 'week' && u.unit !== 'month' && u.unit !== 'year') return null;
    return {
      type: 'window',
      from: { type: 'relative', offset: { days: 0 }, direction: 'this' },
      to:   { type: 'boundary', unit: u.unit, edge: 'end' },
    };
  },
};

// DD.MM, DD.MM.YYYY — numeric date in Ukrainian DMY order. Tokenizer kept the
// dot-separated form as a single Literal so this rule can re-parse it.
export const ukDdMmDateRule: Rule = {
  name: 'uk-dd-mm-date',
  priority: 100,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => /^\d{1,2}\.\d{1,2}(?:\.\d{4})?$/.test(t.text) }],
  produce: (matched) => {
    const t = matched[0] as Token;
    const m = t.text.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/);
    if (!m) return null;
    const day = +m[1]!;
    const month = +m[2]!;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const year = m[3] !== undefined ? +m[3]! : undefined;
    return year !== undefined
      ? { type: 'absolute', year, month, day }
      : { type: 'absolute', month, day };
  },
};

// DD.MM-DD.MM — compact range, same month or not, no spaces.
export const ukDdMmRangeRule: Rule = {
  name: 'uk-dd-mm-range',
  priority: 100,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => /^\d{1,2}\.\d{1,2}-\d{1,2}\.\d{1,2}$/.test(t.text) }],
  produce: (matched) => {
    const t = matched[0] as Token;
    const m = t.text.match(/^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})$/);
    if (!m) return null;
    const d1 = +m[1]!, mo1 = +m[2]!, d2 = +m[3]!, mo2 = +m[4]!;
    if (d1 < 1 || d1 > 31 || mo1 < 1 || mo1 > 12) return null;
    if (d2 < 1 || d2 > 31 || mo2 < 1 || mo2 > 12) return null;
    return {
      type: 'range',
      start: { type: 'absolute', month: mo1, day: d1 },
      end:   { type: 'absolute', month: mo2, day: d2 },
      convention: 'checkout',
    };
  },
};

// "найближчі вихідні" → nearest upcoming Saturday-Sunday pair.
// Uses the same offset_from trick as naVihidniRule to keep Sat+Sun anchored together.
export const najblyzchiVihidniRule: Rule = {
  name: 'uk:najblyzchi-vihidni',
  priority: 40,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'nearest') },
    { kind: 'tag', tag: 'Literal',  predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => {
    const startNode = { type: 'weekday' as const, weekday: 6, modifier: 'nearest' as const };
    return {
      type: 'range',
      start: startNode,
      end:   { type: 'offset_from', base: startNode, days: 1 },
      convention: 'checkout',
    };
  },
};

// "на вихідні" → nearest upcoming Saturday-Sunday pair.
// Uses offset_from to anchor Sunday relative to the resolved Saturday, avoiding
// the edge case where `nearest` Sunday lands before `nearest` Saturday when the
// reference day is Saturday (delta=1 → tomorrow, but `nearest` Sat jumped +7).
export const naVihidniRule: Rule = {
  name: 'uk:na-vihidni',
  priority: 40,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^на$/i.test(t.text) },
    { kind: 'tag', tag: 'Literal',   predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => {
    const startNode = { type: 'weekday' as const, weekday: 6, modifier: 'nearest' as const };
    return {
      type: 'range',
      start: startNode,
      end:   { type: 'offset_from', base: startNode, days: 1 },
      convention: 'checkout',
    };
  },
};

// "десь у травні" / "приблизно в серпні" → fuzzy{granularity:'month'}
export const vagueMonthRule: Rule = {
  name: 'uk:vague-month',
  priority: 50,
  pattern: [
    { kind: 'tag', tag: 'VagueMarker' },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'in') },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const monthTag = (matched[2] as Token).tags.find(t => t.kind === 'MonthName');
    if (!monthTag || monthTag.kind !== 'MonthName') return null;
    return {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'absolute', month: monthTag.month },
      reason: 'vague_month',
    };
  },
};

export const ukRules: Rule[] = [
  ukDdMmDateRule, ukDdMmRangeRule,
  ukTodayRule, ukTomorrowRule, ukYesterdayRule, ukDayAfterTomorrowRule,
  ukNextWeekdayRule, ukNearestWeekdayRule, ukThisWeekdayRule,
  ukThroughNRule,
  ukUntilEndOfRule,
  ukRangeUntilRule, ukRangeThroughRule,
  ukDayMonthRule,
  najblyzchiVihidniRule,
  naVihidniRule,
  vagueMonthRule,
];
