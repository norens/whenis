import type { Locale } from '@whenis/core';
import { ukLexicon, ukStems } from './lexicon';
import { ukRules } from './rules';

function normalizeApostrophes(s: string): string {
  return s.replace(/['’ʼʹ′´`]/g, "'");
}

export const uk: Locale = {
  code: 'uk',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase(), normalizeApostrophes],
  lexicon: ukLexicon,
  stems: ukStems,
  skip: new Set(['р.', 'року', 'рік']),
  rules: ukRules,
  defaults: { preferFuture: true },
};
