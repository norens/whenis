import { tokenize } from './tokenizer';
import { runRules } from './rule-engine';
import { resolve } from './resolver';
import { baseRules } from './base-rules';
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
  const locale = cfg.locales[0];
  if (!locale) throw new Error('whenis: at least one locale required');
  const plugins = cfg.plugins ?? [];

  // Merge plugin lexicon into a per-parser locale (immutable merge)
  const mergedLexicon = new Map(locale.lexicon);
  for (const p of plugins) {
    if (!p.tags) continue;
    for (const [k, v] of p.tags) mergedLexicon.set(k, v);
  }
  const mergedLocale: Locale = { ...locale, lexicon: mergedLexicon };

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
