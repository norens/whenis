import type { Tag } from '@whenis/core';

const entries: Array<[string, Tag[]]> = [
  // Months
  ['january',   [{ kind: 'MonthName', month: 1 }]],
  ['february',  [{ kind: 'MonthName', month: 2 }]],
  ['march',     [{ kind: 'MonthName', month: 3 }]],
  ['april',     [{ kind: 'MonthName', month: 4 }]],
  ['may',       [{ kind: 'MonthName', month: 5 }]],
  ['june',      [{ kind: 'MonthName', month: 6 }]],
  ['july',      [{ kind: 'MonthName', month: 7 }]],
  ['august',    [{ kind: 'MonthName', month: 8 }]],
  ['september', [{ kind: 'MonthName', month: 9 }]],
  ['october',   [{ kind: 'MonthName', month: 10 }]],
  ['november',  [{ kind: 'MonthName', month: 11 }]],
  ['december',  [{ kind: 'MonthName', month: 12 }]],
  // Weekdays
  ['monday',    [{ kind: 'WeekdayName', weekday: 1 }]],
  ['tuesday',   [{ kind: 'WeekdayName', weekday: 2 }]],
  ['wednesday', [{ kind: 'WeekdayName', weekday: 3 }]],
  ['thursday',  [{ kind: 'WeekdayName', weekday: 4 }]],
  ['friday',    [{ kind: 'WeekdayName', weekday: 5 }]],
  ['saturday',  [{ kind: 'WeekdayName', weekday: 6 }]],
  ['sunday',    [{ kind: 'WeekdayName', weekday: 7 }]],
  // Pointers
  ['next',      [{ kind: 'Grabber', modifier: 'next' }]],
  ['last',      [{ kind: 'Grabber', modifier: 'last' }]],
  ['this',      [{ kind: 'Pointer', direction: 'this' }]],
  ['in',        [{ kind: 'Grabber', modifier: 'in' }]],
  ['within',    [{ kind: 'Grabber', modifier: 'within' }]],
  // Connectors
  ['from',      [{ kind: 'Connector', conn: 'from' }]],
  ['to',        [{ kind: 'Connector', conn: 'to' }]],
  ['through',   [{ kind: 'Connector', conn: 'through' }]],
  ['until',     [{ kind: 'Grabber', modifier: 'until' }]],
  // Units
  ['day',       [{ kind: 'TimeUnit', unit: 'day' }]],
  ['days',      [{ kind: 'TimeUnit', unit: 'day' }]],
  ['night',     [{ kind: 'TimeUnit', unit: 'night' }]],
  ['nights',    [{ kind: 'TimeUnit', unit: 'night' }]],
  ['week',      [{ kind: 'TimeUnit', unit: 'week' }]],
  ['weeks',     [{ kind: 'TimeUnit', unit: 'week' }]],
  ['month',     [{ kind: 'TimeUnit', unit: 'month' }]],
  ['months',    [{ kind: 'TimeUnit', unit: 'month' }]],
  // Immediate
  ['today',     [{ kind: 'Literal', text: '__today__' }]],
  ['tomorrow',  [{ kind: 'Literal', text: '__tomorrow__' }]],
  ['yesterday', [{ kind: 'Literal', text: '__yesterday__' }]],
];

export const enLexicon = new Map(entries);
