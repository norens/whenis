import type { Rule, Token, Tag, IRNode } from '@whenis/core';

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

function makeWindow(n: number, unit: 'day' | 'week'): IRNode {
  const days = unit === 'week' ? n * 7 : n;
  return {
    type: 'window',
    from: { type: 'relative', offset: { days: 0 }, direction: 'this' },
    to:   { type: 'relative', offset: { days: days - 1 }, direction: 'future' },
  };
}

// "впродовж 7 днів" — also matches "впродовж наступних 7 днів" via optional next-filler
export const windowWithinNRule: Rule = {
  name: 'booking-window-within',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'within') },
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next'), optional: true },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[2] as Token, 'Numeral');
    const u = findTag(matched[3] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    if (u.unit !== 'day' && u.unit !== 'week') return null;
    return makeWindow(n.value, u.unit);
  },
};

// "у найближчі 5 днів" — also matches "у наступні найближчі 5 днів" via optional next-filler
export const windowWithinNWithPrefixRule: Rule = {
  name: 'booking-window-within-prefixed',
  priority: 76,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^[ув]$/i.test(t.text) },
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'within') },
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next'), optional: true },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[3] as Token, 'Numeral');
    const u = findTag(matched[4] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    if (u.unit !== 'day' && u.unit !== 'week') return null;
    return makeWindow(n.value, u.unit);
  },
};

export const stayDurationRule: Rule = {
  name: 'booking-stay-duration',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^на$/i.test(t.text) },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[1] as Token, 'Numeral');
    const u = findTag(matched[2] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    switch (u.unit) {
      case 'night': return { type: 'duration', nights: n.value };
      case 'day':   return { type: 'duration', nights: n.value };
      case 'week':  return { type: 'duration', nights: n.value * 7 };
      default:      return null;
    }
  },
};

export const weekendNextRule: Rule = {
  name: 'booking-weekend-next',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => ({
    type: 'range',
    start: { type: 'weekday', weekday: 6, modifier: 'next' },
    end:   { type: 'weekday', weekday: 7, modifier: 'next' },
    convention: 'checkout',
  }),
};

export const weekendThisRule: Rule = {
  name: 'booking-weekend-this',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => ({
    type: 'range',
    start: { type: 'weekday', weekday: 6, modifier: 'this' },
    end:   { type: 'weekday', weekday: 7, modifier: 'this' },
    convention: 'checkout',
  }),
};

// "останні вихідні [в/у] [травня]" — last Saturday-Sunday pair of the named (or current) month.
// The 'в'/'у' filler (Connector:in) between the weekend literal and the month name is optional.
export const weekendLastOfMonthRule: Rule = {
  name: 'booking-weekend-last-of-month',
  priority: 82,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'last') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'in'), optional: true },
    { kind: 'tag', tag: 'MonthName', optional: true },
  ],
  produce: (matched) => {
    // matched[2] is the optional Connector:in filler (null if absent)
    // matched[3] is the optional MonthName (null if absent)
    const monthTok = matched[3] as Token | null;
    const mTag = monthTok?.tags.find(t => t.kind === 'MonthName');
    const month = mTag && mTag.kind === 'MonthName' ? mTag.month : undefined;
    const start: IRNode = month !== undefined
      ? { type: 'last_weekday_in_month', weekday: 6, month }
      : { type: 'last_weekday_in_month', weekday: 6 };
    return {
      type: 'range',
      start,
      end:   { type: 'offset_from', base: start, days: 1 },
      convention: 'checkout',
    };
  },
};

// "перші вихідні [в/у] [серпня]" — first Saturday-Sunday pair of the named (or current) month.
export const weekendFirstOfMonthRule: Rule = {
  name: 'booking-weekend-first-of-month',
  priority: 82,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'first') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'in'), optional: true },
    { kind: 'tag', tag: 'MonthName', optional: true },
  ],
  produce: (matched) => {
    const monthTok = matched[3] as Token | null;
    const mTag = monthTok?.tags.find(t => t.kind === 'MonthName');
    const month = mTag && mTag.kind === 'MonthName' ? mTag.month : undefined;
    const start: IRNode = month !== undefined
      ? { type: 'first_weekday_in_month', weekday: 6, month }
      : { type: 'first_weekday_in_month', weekday: 6 };
    return {
      type: 'range',
      start,
      end:   { type: 'offset_from', base: start, days: 1 },
      convention: 'checkout',
    };
  },
};

// "після свят" — neither word has a tag in default UA lexicon, both arrive as Literal.
export const holidayPislyaRule: Rule = {
  name: 'booking-holiday-pislya',
  priority: 90,
  pattern: [
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^після$/i.test(t.text) },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^свят/i.test(t.text) },
  ],
  produce: () => ({
    type: 'fuzzy',
    granularity: 'month',
    ref: { type: 'absolute' },
    reason: 'holiday_ref',
  }),
};

// "на свята" — «на» is tagged by booking as Connector; «свят*» arrives as Literal.
export const holidayNaRule: Rule = {
  name: 'booking-holiday-na',
  priority: 90,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^на$/i.test(t.text) },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^свят/i.test(t.text) },
  ],
  produce: () => ({
    type: 'fuzzy',
    granularity: 'month',
    ref: { type: 'absolute' },
    reason: 'holiday_ref',
  }),
};

// "[з] 5 червня на 3 ночі" — combine a previously-emitted absolute date with a
// duration into a single range. Both sub-IRs are produced by their own rules
// at lower priority (60 / 75); this rule fires next, gluing them together.
export const bookingDateWithNightsRule: Rule = {
  name: 'booking-date-with-nights',
  priority: 80,
  pattern: [
    { kind: 'tag',  tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'from'), optional: true },
    { kind: 'node', node: 'absolute' },
    { kind: 'node', node: 'duration' },
  ],
  produce: (matched) => {
    const a = matched[1] as IRNode;
    const d = matched[2] as IRNode;
    if (a.type !== 'absolute' || d.type !== 'duration') return null;
    const nights = d.nights;
    if (nights === undefined) return null;
    return {
      type: 'range',
      start: a,
      end:   { type: 'offset_from', base: a, days: nights },
      convention: 'checkout',
    };
  },
};

export const bookingRules: Rule[] = [
  windowWithinNRule,
  windowWithinNWithPrefixRule,
  bookingDateWithNightsRule,
  stayDurationRule,
  weekendNextRule,
  weekendThisRule,
  weekendLastOfMonthRule,
  weekendFirstOfMonthRule,
  holidayPislyaRule,
  holidayNaRule,
];

// Tags the booking plugin contributes to ANY locale that uses it.
export const bookingTags = new Map<string, Tag[]>([
  ['впродовж', [{ kind: 'Grabber', modifier: 'within' }]],
  ['найближчі', [{ kind: 'Grabber', modifier: 'within' }]],
  ['найближчих', [{ kind: 'Grabber', modifier: 'within' }]],
  ['перші', [{ kind: 'Grabber', modifier: 'first' }]],
  ['перших', [{ kind: 'Grabber', modifier: 'first' }]],
  ['перша', [{ kind: 'Grabber', modifier: 'first' }]],
  ['у', [{ kind: 'Connector', conn: 'in' }]],
  ['в', [{ kind: 'Connector', conn: 'in' }]],
  ['на', [{ kind: 'Connector', conn: 'from' }]],
]);
