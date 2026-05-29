export type Tag =
  | { kind: 'Numeral';     value: number }
  | { kind: 'Ordinal';     value: number }
  | { kind: 'MonthName';   month: number }
  | { kind: 'WeekdayName'; weekday: number }
  | { kind: 'TimeUnit';    unit: 'day' | 'week' | 'month' | 'year' | 'night' }
  | { kind: 'Pointer';     direction: 'past' | 'future' | 'this' }
  | { kind: 'Grabber';     modifier: 'next' | 'last' | 'nearest' | 'in' | 'ago' | 'within' | 'until' }
  | { kind: 'Connector';   conn: 'from' | 'to' | 'through' | 'between' | 'and' }
  | { kind: 'Literal';     text: string };

export interface Token {
  text: string;
  start: number;
  end: number;
  tags: Tag[];
  /** Set by tokenizer when the source Locale is a merged one. Undefined for single-locale parsers. */
  sourceLocale?: string;
}
