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
  /** Post-preprocess token texts to drop before classification — date-context fillers
   *  like Ukrainian «р.» / «року». Matched by exact string (case-sensitive against
   *  the already-preprocessed token). */
  skip?: Set<string>;
  rules: Rule[];
  defaults: {
    preferFuture: boolean;
    fuzzyMonthThreshold?: number;
  };
}
