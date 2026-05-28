import type { Token } from './tags';
import type { Rule, PatternItem } from './plugin';
import type { IRNode, IRSpan } from './ir';

type Item =
  | { kind: 'token'; token: Token }
  | { kind: 'node'; node: IRNode; start: number; end: number };

function matches(item: Item, p: PatternItem): boolean {
  if (p.kind === 'tag') {
    if (item.kind !== 'token') return false;
    if (!item.token.tags.some(t => t.kind === p.tag)) return false;
    if (p.predicate && !p.predicate(item.token)) return false;
    return true;
  }
  // p.kind === 'node'
  return item.kind === 'node' && item.node.type === p.node;
}

function itemsToMatched(items: Item[]): Array<Token | IRNode> {
  return items.map(i => (i.kind === 'token' ? i.token : i.node));
}

export function runRules(initialTokens: Token[], rules: Rule[]): IRSpan[] {
  const ordered = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  let items: Item[] = initialTokens.map(t => ({ kind: 'token', token: t }));

  // Iterate until no rule fires
  let changed = true;
  let safetyCounter = 0;
  while (changed) {
    if (++safetyCounter > 1000) throw new Error('whenis: rule engine infinite loop');
    changed = false;
    outer: for (const rule of ordered) {
      const len = rule.pattern.length;
      if (len === 0) continue;
      for (let i = 0; i <= items.length - len; i++) {
        const window = items.slice(i, i + len);
        if (window.every((it, idx) => matches(it, rule.pattern[idx]!))) {
          const produced = rule.produce(itemsToMatched(window));
          if (produced) {
            const start = window[0]!.kind === 'token' ? window[0]!.token.start : window[0]!.start;
            const lastWindow = window[window.length - 1]!;
            const end = lastWindow.kind === 'token' ? lastWindow.token.end : lastWindow.end;
            items = [
              ...items.slice(0, i),
              { kind: 'node', node: produced, start, end },
              ...items.slice(i + len),
            ];
            changed = true;
            break outer; // restart from top-priority rule
          }
        }
      }
    }
  }

  return items.filter((it): it is Extract<Item, { kind: 'node' }> => it.kind === 'node')
    .map(it => ({ node: it.node, start: it.start, end: it.end }));
}
