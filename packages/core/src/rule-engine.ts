import type { Token } from './tags';
import type { Rule, PatternItem } from './plugin';
import type { IRNode, IRSpan } from './ir';

type Item =
  | { kind: 'token'; token: Token }
  | { kind: 'node'; node: IRNode; start: number; end: number };

function matchesItem(item: Item, p: PatternItem): boolean {
  if (p.kind === 'tag') {
    if (item.kind !== 'token') return false;
    if (!item.token.tags.some(t => t.kind === p.tag)) return false;
    if (p.predicate && !p.predicate(item.token)) return false;
    return true;
  }
  return item.kind === 'node' && item.node.type === p.node;
}

interface MatchResult {
  window: Item[];
  matched: Array<Token | IRNode | null>;
  width: number;
}

/** Try to match `pattern` starting at items[i]. Enumerates subsets of optional
 *  items to keep, preferring longer (more-specific) matches first. */
function tryMatch(items: Item[], i: number, pattern: PatternItem[]): MatchResult | null {
  const optionalIdxs: number[] = [];
  for (let idx = 0; idx < pattern.length; idx++) {
    if (pattern[idx]!.optional) optionalIdxs.push(idx);
  }
  const k = optionalIdxs.length;

  if (k === 0) {
    const width = pattern.length;
    if (i + width > items.length) return null;
    const window = items.slice(i, i + width);
    if (!window.every((it, idx) => matchesItem(it, pattern[idx]!))) return null;
    return {
      window,
      matched: window.map(it => (it.kind === 'token' ? it.token : it.node)),
      width,
    };
  }

  for (let mask = (1 << k) - 1; mask >= 0; mask--) {
    const skipIdx = new Set<number>();
    for (let bit = 0; bit < k; bit++) {
      if ((mask & (1 << bit)) === 0) skipIdx.add(optionalIdxs[bit]!);
    }
    const effective = pattern.filter((_, idx) => !skipIdx.has(idx));
    const width = effective.length;
    if (width === 0) continue;
    if (i + width > items.length) continue;
    const window = items.slice(i, i + width);
    if (!window.every((it, idx) => matchesItem(it, effective[idx]!))) continue;

    const matched: Array<Token | IRNode | null> = [];
    let wi = 0;
    for (let idx = 0; idx < pattern.length; idx++) {
      if (skipIdx.has(idx)) {
        matched.push(null);
      } else {
        const it = window[wi++]!;
        matched.push(it.kind === 'token' ? it.token : it.node);
      }
    }
    return { window, matched, width };
  }
  return null;
}

export function runRules(initialTokens: Token[], rules: Rule[]): IRSpan[] {
  const ordered = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  let items: Item[] = initialTokens.map(t => ({ kind: 'token', token: t }));

  let changed = true;
  let safetyCounter = 0;
  while (changed) {
    if (++safetyCounter > 1000) throw new Error('whenis: rule engine infinite loop');
    changed = false;
    outer: for (const rule of ordered) {
      if (rule.pattern.length === 0) continue;
      for (let i = 0; i < items.length; i++) {
        const result = tryMatch(items, i, rule.pattern);
        if (!result) continue;
        const produced = rule.produce(result.matched);
        if (!produced) continue;
        const firstItem = result.window[0]!;
        const lastItem = result.window[result.window.length - 1]!;
        const start = firstItem.kind === 'token' ? firstItem.token.start : firstItem.start;
        const end = lastItem.kind === 'token' ? lastItem.token.end : lastItem.end;
        items = [
          ...items.slice(0, i),
          { kind: 'node', node: produced, start, end },
          ...items.slice(i + result.width),
        ];
        changed = true;
        break outer;
      }
    }
  }

  return items
    .filter((it): it is Extract<Item, { kind: 'node' }> => it.kind === 'node')
    .map(it => ({ node: it.node, start: it.start, end: it.end }));
}
