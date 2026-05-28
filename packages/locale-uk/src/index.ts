import type { Locale } from '@whenis/core';
import { ukLexicon, ukStems } from './lexicon';

function normalizeApostrophes(s: string): string {
  return s.replace(/['ʼʹ′´`]/g, "'");
}

export const uk: Locale = {
  code: 'uk',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase(), normalizeApostrophes],
  lexicon: ukLexicon,
  stems: ukStems,
  rules: [], // populated in Task 10
  defaults: { preferFuture: true },
};
