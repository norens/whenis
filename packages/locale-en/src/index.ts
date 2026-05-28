import type { Locale } from '@whenis/core';
import { enLexicon } from './lexicon';
import { enRules } from './rules';

export const en: Locale = {
  code: 'en',
  dateOrder: 'MDY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase()],
  lexicon: enLexicon,
  stems: [],
  rules: enRules,
  defaults: { preferFuture: true },
};
