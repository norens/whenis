import { tokenize } from './tokenizer';
import { runRules } from './rule-engine';
import { resolve } from './resolver';
import { baseRules } from './base-rules';
import { mergeLocales } from './merge-locales';
import type { Locale } from './locale';
import type { Plugin, ResolverCtx, Rule } from './plugin';
import type { ParseOptions, ParseResult, Match } from './types';

export interface CreateParserOptions {
  locales: Locale[];
  plugins?: Plugin[];
  options?: { preferFuture?: boolean };
}

export interface Parser {
  parse(input: string, opts: ParseOptions): ParseResult;
}

export function createParser(cfg: CreateParserOptions): Parser {
  // mergeLocales throws if array is empty, and short-circuits to identity for single-locale arrays.
  const locale = mergeLocales(cfg.locales);
  const plugins = cfg.plugins ?? [];

  // Merge plugin lexicon into the (possibly already-merged) locale (immutable merge, locale wins on collision)
  const mergedLexicon = new Map(locale.lexicon);
  const lexiconSource = new Map(locale.lexiconSource ?? []);
  for (const p of plugins) {
    if (!p.tags) continue;
    for (const [k, v] of p.tags) {
      if (!mergedLexicon.has(k)) {
        mergedLexicon.set(k, v);
        lexiconSource.set(k, `plugin:${p.name ?? 'anon'}`);
      }
    }
  }
  const mergedLocale: Locale = {
    ...locale,
    lexicon: mergedLexicon,
    lexiconSource: lexiconSource.size > 0 ? lexiconSource : undefined,
  };

  const allRules: Rule[] = [
    ...baseRules,
    ...locale.rules,
    ...plugins.flatMap(p => p.rules ?? []),
  ];

  const enrichers = plugins.flatMap(p => p.enrichers ?? []);

  return {
    parse(input: string, opts: ParseOptions): ParseResult {
      if (input.trim() === '') return { source: input, matches: [] };
      const tokens = tokenize(input, mergedLocale);
      const irSpans = runRules(tokens, allRules);
      const ctx: ResolverCtx = {
        reference: opts.reference,
        timezone: opts.timezone ?? 'UTC',
        preferFuture: cfg.options?.preferFuture ?? locale.defaults.preferFuture,
      };
      const matches: Match[] = irSpans.map(span => {
        let candidates = resolve(span.node, ctx);
        for (const e of enrichers) candidates = candidates.map(c => e.apply(c, ctx));
        candidates.sort((a, b) => b.confidence - a.confidence);
        return {
          text: input.slice(span.start, span.end),
          start: span.start,
          end: span.end,
          candidates,
        };
      });
      return { source: input, matches };
    },
  };
}

// Re-exports
export type { Locale } from './locale';
export type { Plugin, Rule, PatternItem, ResolverCtx, IRTypeExt, Enricher } from './plugin';
export type { Tag, Token } from './tags';
export type { IRNode, IRSpan } from './ir';
export type { ParseOptions, ParseResult, Match, ResolvedDate } from './types';
export { tokenize, runRules, resolve, baseRules };
export { mergeLocales } from './merge-locales';
