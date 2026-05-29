import type { Locale } from './locale';

/**
 * Combine multiple Locales into one synthetic Locale with ordered-fallback semantics.
 * On lexicon-key collisions, the first locale in the array wins.
 * Stems concatenate in order; the tokenizer's "first regex match wins" rule then breaks ties
 * by locale position naturally.
 * Preprocess functions compose in array order (locales[0].preprocess runs first).
 * Skip sets are unioned. Rules concatenate; the rule engine sorts by priority and ties break by source order.
 * dateOrder, weekStart, defaults come from locales[0]. Code becomes 'a+b+...'.
 */
export function mergeLocales(locales: Locale[]): Locale {
  if (locales.length === 0) throw new Error('whenis: at least one locale required');
  if (locales.length === 1) return locales[0]!;

  const lexicon: Locale['lexicon'] = new Map();
  const lexiconSource = new Map<string, string>();
  for (const l of locales) {
    for (const [k, v] of l.lexicon) {
      if (!lexicon.has(k)) {
        lexicon.set(k, v);
        lexiconSource.set(k, l.code);
      }
    }
  }

  const stems: Locale['stems'] = [];
  const stemSource: string[] = [];
  for (const l of locales) {
    for (const stem of l.stems) {
      stems.push(stem);
      stemSource.push(l.code);
    }
  }

  const preprocess: Locale['preprocess'] = [];
  for (const l of locales) preprocess.push(...l.preprocess);

  const skip = new Set<string>();
  for (const l of locales) if (l.skip) for (const s of l.skip) skip.add(s);

  const rules = locales.flatMap(l => l.rules);

  const first = locales[0]!;
  return {
    code: locales.map(l => l.code).join('+'),
    dateOrder: first.dateOrder,
    weekStart: first.weekStart,
    preprocess,
    lexicon,
    lexiconSource,
    stems,
    stemSource,
    skip: skip.size > 0 ? skip : undefined,
    rules,
    defaults: first.defaults,
  };
}
