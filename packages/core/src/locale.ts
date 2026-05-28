import type { Tag } from './tags';
import type { Rule } from './plugin';

export interface Locale {
  code: string;
  dateOrder: 'DMY' | 'MDY' | 'YMD';
  weekStart: 'mon' | 'sun';
  preprocess: ((s: string) => string)[];
  /** Exact-string lookup; takes precedence over stems. */
  lexicon: Map<string, Tag[]>;
  /** Regex fallback for morphological stems (e.g. /^трав/ → MonthName(5)). */
  stems: Array<[RegExp, Tag[]]>;
  rules: Rule[];
  defaults: {
    preferFuture: boolean;
    fuzzyMonthThreshold?: number;
  };
}
