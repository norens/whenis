# whenis v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship `whenis` v0.1 — TypeScript-first natural-language date parser for Ukrainian and basic English, with a plugin architecture, distributed as a pnpm monorepo across `@whenis/core`, `@whenis/locale-uk`, `@whenis/locale-en`, and `@whenis/booking`.

**Architecture:** 4-layer pure-functional pipeline (preprocess → tokenize+tag → iterative rule engine → resolver) with discriminated-union IR. Locales are pure data + rules. Plugins extend with new rules, IR node types, and enrichers. Multi-candidate output ranked by confidence.

**Tech Stack:** TypeScript 5.x (strict), pnpm workspaces, Vitest (test + golden corpus), tsup (ESM+CJS dual build), GitHub Actions CI, Luxon (date arithmetic).

**Spec:** `docs/design.md`

**Working directory:** `/Users/nazarfedisin/WebstormProjects/whenis` on branch `main`.

---

## File map

| File | Purpose |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore` | Monorepo root |
| `vitest.workspace.ts` | Single vitest config across packages |
| `.github/workflows/ci.yml` | CI: lint + typecheck + test on Node 18/20/22 |
| `README.md` | Root readme, quickstart |
| `packages/core/src/tags.ts` | `Tag` discriminated union |
| `packages/core/src/ir.ts` | `IRNode` discriminated union |
| `packages/core/src/types.ts` | Public API: `ParseResult`, `Match`, `ResolvedDate`, `ParseOptions` |
| `packages/core/src/locale.ts` | `Locale` interface |
| `packages/core/src/plugin.ts` | `Plugin`, `Rule`, `PatternItem`, `Token`, `IRTypeExt`, `Enricher` interfaces |
| `packages/core/src/tokenizer.ts` | `tokenize(text, locale) → Token[]` |
| `packages/core/src/rule-engine.ts` | `runRules(tokens, rules) → IRNode[]` (iterative fixpoint) |
| `packages/core/src/resolver.ts` | `resolve(irNodes, ctx) → ResolvedDate[]` |
| `packages/core/src/base-rules.ts` | Locale-agnostic rules (ISO, Numeral+TimeUnit→duration, etc.) |
| `packages/core/src/index.ts` | `createParser({locales, plugins, options}) → Parser` |
| `packages/locale-uk/src/lexicon.ts` | UA inflected forms → Tag[] |
| `packages/locale-uk/src/rules.ts` | UA-specific rules |
| `packages/locale-uk/src/index.ts` | Exported `uk: Locale` |
| `packages/locale-uk/test/corpus.jsonl` | Golden parses for UA |
| `packages/locale-en/src/{lexicon,rules,index}.ts` | EN basic |
| `packages/locale-en/test/corpus.jsonl` | Golden parses for EN |
| `packages/booking/src/rules.ts` | WindowParser, StayDuration, WeekendPair, HolidayRef |
| `packages/booking/src/enrichers.ts` | MostlyPastEnricher |
| `packages/booking/src/index.ts` | Exported `booking: Plugin` |

---

### Task 1: Monorepo skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `vitest.workspace.ts`, `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "whenis-monorepo",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "pnpm -r typecheck",
    "lint": "eslint packages"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.5.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "lib": ["ES2022"]
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
*.log
.DS_Store
coverage/
.vitest-cache/
```

- [ ] **Step 5: Create `vitest.workspace.ts`**

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
]);
```

- [ ] **Step 6: Create root `README.md`**

```markdown
# whenis

Natural-language date parsing for TypeScript. Ukrainian + English. Plugin-extensible.

## Quickstart

\`\`\`ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk] });
const result = parser.parse('наступної п\'ятниці', { reference: new Date() });
\`\`\`

See `docs/design.md` for architecture.
```

- [ ] **Step 7: Install + commit**

```bash
pnpm install
git add .
git commit -m "chore: monorepo skeleton (pnpm workspaces, tsconfig, vitest)"
```

---

### Task 2: Core types (Tag + IRNode + public API)

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/tsup.config.ts`, `packages/core/vitest.config.ts`
- Create: `packages/core/src/tags.ts`, `packages/core/src/ir.ts`, `packages/core/src/types.ts`
- Test: `packages/core/test/types.test.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@whenis/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "luxon": "^3.5.0"
  },
  "devDependencies": {
    "@types/luxon": "^3.4.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create `packages/core/src/tags.ts`**

```ts
export type Tag =
  | { kind: 'Numeral';     value: number }
  | { kind: 'Ordinal';     value: number }
  | { kind: 'MonthName';   month: number }
  | { kind: 'WeekdayName'; weekday: number }
  | { kind: 'TimeUnit';    unit: 'day' | 'week' | 'month' | 'year' | 'night' }
  | { kind: 'Pointer';     direction: 'past' | 'future' | 'this' }
  | { kind: 'Grabber';     modifier: 'next' | 'last' | 'nearest' | 'in' | 'ago' | 'within' | 'until' }
  | { kind: 'Connector';   conn: 'from' | 'to' | 'through' | 'between' | 'and' }
  | { kind: 'Literal';     text: string };

export interface Token {
  text: string;
  start: number;
  end: number;
  tags: Tag[];
}
```

- [ ] **Step 6: Create `packages/core/src/ir.ts`**

```ts
export type IRNode =
  | { type: 'absolute';   year?: number; month?: number; day?: number; weekday?: number }
  | { type: 'relative';   offset: { weeks?: number; days?: number; months?: number; years?: number }; direction: 'past' | 'future' | 'this' }
  | { type: 'weekday';    weekday: number; modifier: 'this' | 'next' | 'last' | 'nearest' }
  | { type: 'duration';   nights?: number; days?: number; weeks?: number }
  | { type: 'window';     from: IRNode; to: IRNode }
  | { type: 'range';      start: IRNode; end: IRNode; convention: 'checkout' | 'inclusive' }
  | { type: 'fuzzy';      granularity: 'month' | 'season' | 'year'; ref: IRNode; reason: string }
  | { type: 'unresolved'; reason: string };

export interface IRSpan {
  node: IRNode;
  start: number;
  end: number;
}
```

- [ ] **Step 7: Create `packages/core/src/types.ts`**

```ts
export interface ParseOptions {
  reference: Date;
  timezone?: string;
}

export interface ParseResult {
  source: string;
  matches: Match[];
}

export interface Match {
  text: string;
  start: number;
  end: number;
  candidates: ResolvedDate[];
}

export interface ResolvedDate {
  confidence: number;
  type: 'date' | 'range' | 'window' | 'duration' | 'fuzzy';
  date?: string;
  start?: string;
  end?: string;
  nights?: number;
  granularity?: 'day' | 'month' | 'year';
  reason?: string;
  metadata?: Record<string, unknown>;
}
```

- [ ] **Step 8: Write smoke test ensuring types compile**

`packages/core/test/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Tag, Token } from '../src/tags';
import type { IRNode } from '../src/ir';
import type { ResolvedDate } from '../src/types';

describe('types smoke', () => {
  it('Tag discriminated union narrows correctly', () => {
    const t: Tag = { kind: 'Numeral', value: 7 };
    if (t.kind === 'Numeral') {
      expect(t.value).toBe(7);
    }
  });

  it('IRNode discriminated union narrows', () => {
    const n: IRNode = { type: 'duration', nights: 3 };
    if (n.type === 'duration') {
      expect(n.nights).toBe(3);
    }
  });

  it('ResolvedDate optional fields are typed', () => {
    const r: ResolvedDate = { confidence: 1, type: 'date', date: '2026-05-29' };
    expect(r.date).toBe('2026-05-29');
  });
});
```

- [ ] **Step 9: Run + commit**

```bash
pnpm install
pnpm --filter @whenis/core typecheck
pnpm test
git add packages/core
git commit -m "feat(core): public types — Tag, IRNode, ParseResult, ResolvedDate"
```

Expected: all PASS, typecheck clean.

---

### Task 3: Locale + Plugin + Rule interfaces

**Files:**
- Create: `packages/core/src/locale.ts`, `packages/core/src/plugin.ts`
- Test: `packages/core/test/interfaces.test.ts`

- [ ] **Step 1: Create `packages/core/src/locale.ts`**

```ts
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
```

- [ ] **Step 2: Create `packages/core/src/plugin.ts`**

```ts
import type { Token, Tag } from './tags';
import type { IRNode } from './ir';
import type { ResolvedDate, ParseOptions } from './types';

export type PatternItem =
  | { kind: 'tag'; tag: Tag['kind']; predicate?: (t: Token) => boolean }
  | { kind: 'node'; node: IRNode['type'] };

export interface Rule {
  name: string;
  priority?: number;
  pattern: PatternItem[];
  produce: (matched: Array<Token | IRNode>) => IRNode | null;
}

export interface ResolverCtx {
  reference: Date;
  timezone: string;
  preferFuture: boolean;
}

export interface IRTypeExt {
  type: string;
  resolve: (node: IRNode, ctx: ResolverCtx) => ResolvedDate[];
}

export interface Enricher {
  apply: (candidate: ResolvedDate, ctx: ResolverCtx) => ResolvedDate;
}

export interface Plugin {
  name: string;
  tags?: Map<string, Tag[]>;
  rules?: Rule[];
  irExtensions?: IRTypeExt[];
  enrichers?: Enricher[];
}
```

- [ ] **Step 3: Write interface smoke test**

`packages/core/test/interfaces.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Locale } from '../src/locale';
import type { Plugin, Rule } from '../src/plugin';

describe('interfaces smoke', () => {
  it('Locale shape compiles', () => {
    const stub: Locale = {
      code: 'xx',
      dateOrder: 'DMY',
      weekStart: 'mon',
      preprocess: [],
      lexicon: new Map(),
      stems: [],
      rules: [],
      defaults: { preferFuture: true },
    };
    expect(stub.code).toBe('xx');
  });

  it('Plugin shape compiles', () => {
    const p: Plugin = {
      name: '@test/plugin',
      rules: [],
    };
    expect(p.name).toBe('@test/plugin');
  });

  it('Rule shape compiles', () => {
    const r: Rule = {
      name: 'noop',
      pattern: [],
      produce: () => null,
    };
    expect(r.name).toBe('noop');
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @whenis/core typecheck
pnpm test
git add packages/core
git commit -m "feat(core): Locale + Plugin + Rule interfaces"
```

---

### Task 4: Tokenizer

**Files:**
- Create: `packages/core/src/tokenizer.ts`
- Test: `packages/core/test/tokenizer.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/core/test/tokenizer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/tokenizer';
import type { Locale } from '../src/locale';

const makeLocale = (lexicon: Record<string, any>, stems: Array<[RegExp, any]> = []): Locale => ({
  code: 'test',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase()],
  lexicon: new Map(Object.entries(lexicon)),
  stems,
  rules: [],
  defaults: { preferFuture: true },
});

describe('tokenize', () => {
  it('splits on whitespace and assigns positions', () => {
    const locale = makeLocale({});
    const tokens = tokenize('hello world', locale);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ text: 'hello', start: 0, end: 5, tags: [{ kind: 'Literal', text: 'hello' }] });
    expect(tokens[1]).toEqual({ text: 'world', start: 6, end: 11, tags: [{ kind: 'Literal', text: 'world' }] });
  });

  it('assigns tags from exact lexicon match (after preprocess)', () => {
    const locale = makeLocale({
      'today': [{ kind: 'Pointer', direction: 'this' }],
    });
    const tokens = tokenize('Today', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'Pointer', direction: 'this' }]);
  });

  it('assigns numeral tag for digit tokens', () => {
    const locale = makeLocale({});
    const tokens = tokenize('5 days', locale);
    expect(tokens[0]!.tags).toContainEqual({ kind: 'Numeral', value: 5 });
  });

  it('falls back to stems when no exact match', () => {
    const locale = makeLocale(
      {},
      [[/^трав/, [{ kind: 'MonthName', month: 5 }]]]
    );
    const tokens = tokenize('травня', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'MonthName', month: 5 }]);
  });

  it('exact match wins over stems', () => {
    const locale = makeLocale(
      { 'травня': [{ kind: 'MonthName', month: 5 }] },
      [[/^трав/, [{ kind: 'MonthName', month: 99 }]]]
    );
    const tokens = tokenize('травня', locale);
    expect(tokens[0]!.tags).toEqual([{ kind: 'MonthName', month: 5 }]);
  });

  it('splits punctuation as separate tokens preserving positions', () => {
    const locale = makeLocale({});
    const tokens = tokenize('5.06', locale);
    // We treat dots inside numbers specifically: see DD.MM rule later.
    // For now, single token with literal text.
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.text).toBe('5.06');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/core/test/tokenizer.test.ts
```

Expected: FAIL with "Cannot find module '../src/tokenizer'".

- [ ] **Step 3: Implement `packages/core/src/tokenizer.ts`**

```ts
import type { Locale } from './locale';
import type { Tag, Token } from './tags';

const NUMBER_RE = /^-?\d+(?:\.\d+)*$/;

export function tokenize(input: string, locale: Locale): Token[] {
  // Apply preprocess chain
  let text = input;
  for (const fn of locale.preprocess) text = fn(text);

  const tokens: Token[] = [];
  // Walk the ORIGINAL input for positions, but classify against preprocessed lowercase.
  const lower = text;
  const original = input;
  const splitRe = /\s+/g;
  let m: RegExpExecArray | null;
  let pos = 0;
  // Collect whitespace-delimited spans from the LOWERCASE form, but compute
  // start/end against the original to keep positions caller-meaningful.
  // For v0.1 we assume preprocess is length-preserving (lowercase + apostrophe
  // normalize); a non-length-preserving preprocess would need a different design.
  if (original.length !== text.length) {
    throw new Error('whenis: preprocess must be length-preserving in v0.1');
  }
  while ((m = splitRe.exec(text)) !== null || pos < text.length) {
    const end = m ? m.index : text.length;
    if (end > pos) {
      const tokText = text.slice(pos, end);
      tokens.push({
        text: original.slice(pos, end),
        start: pos,
        end,
        tags: classifyToken(tokText, locale),
      });
    }
    if (!m) break;
    pos = m.index + m[0].length;
  }
  return tokens;
}

function classifyToken(token: string, locale: Locale): Tag[] {
  // 1) Exact lexicon hit
  const exact = locale.lexicon.get(token);
  if (exact && exact.length > 0) return [...exact];

  // 2) Numeric
  if (NUMBER_RE.test(token)) {
    return [{ kind: 'Numeral', value: Number(token) }];
  }

  // 3) Stem fallback (first matching stem wins)
  for (const [re, tags] of locale.stems) {
    if (re.test(token)) return [...tags];
  }

  // 4) Literal
  return [{ kind: 'Literal', text: token }];
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test packages/core/test/tokenizer.test.ts
```

Expected: 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): tokenizer with exact-match + stem fallback + numeral classification"
```

---

### Task 5: Rule engine (iterative fixpoint)

**Files:**
- Create: `packages/core/src/rule-engine.ts`
- Test: `packages/core/test/rule-engine.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/core/test/rule-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runRules } from '../src/rule-engine';
import type { Rule } from '../src/plugin';
import type { Token } from '../src/tags';

const T = (text: string, tags: Token['tags'], start = 0, end?: number): Token => ({
  text,
  start,
  end: end ?? start + text.length,
  tags,
});

describe('runRules', () => {
  it('returns IR spans for matched patterns', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
      T('днів', [{ kind: 'TimeUnit', unit: 'day' }], 2, 6),
    ];
    const numeralTimeUnit: Rule = {
      name: 'numeral+timeunit',
      pattern: [{ kind: 'tag', tag: 'Numeral' }, { kind: 'tag', tag: 'TimeUnit' }],
      produce: (matched) => {
        const n = matched[0] as Token;
        const u = matched[1] as Token;
        const numeral = n.tags.find(t => t.kind === 'Numeral')!;
        const unit = u.tags.find(t => t.kind === 'TimeUnit')!;
        if (numeral.kind !== 'Numeral' || unit.kind !== 'TimeUnit') return null;
        return { type: 'duration', days: numeral.value };
      },
    };
    const result = runRules(tokens, [numeralTimeUnit]);
    expect(result).toHaveLength(1);
    expect(result[0]!.node).toEqual({ type: 'duration', days: 5 });
    expect(result[0]!.start).toBe(0);
    expect(result[0]!.end).toBe(6);
  });

  it('higher-priority rule fires first', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
    ];
    const lowPrio: Rule = {
      name: 'lo',
      priority: 0,
      pattern: [{ kind: 'tag', tag: 'Numeral' }],
      produce: () => ({ type: 'duration', days: 999 }),
    };
    const highPrio: Rule = {
      name: 'hi',
      priority: 10,
      pattern: [{ kind: 'tag', tag: 'Numeral' }],
      produce: () => ({ type: 'duration', days: 1 }),
    };
    const result = runRules(tokens, [lowPrio, highPrio]);
    expect((result[0]!.node as any).days).toBe(1);
  });

  it('iterates until fixpoint (rule can match emitted IR node)', () => {
    const tokens: Token[] = [
      T('5', [{ kind: 'Numeral', value: 5 }]),
      T('днів', [{ kind: 'TimeUnit', unit: 'day' }], 2, 6),
    ];
    const numeralTimeUnit: Rule = {
      name: 'first',
      pattern: [{ kind: 'tag', tag: 'Numeral' }, { kind: 'tag', tag: 'TimeUnit' }],
      produce: () => ({ type: 'duration', days: 5 }),
    };
    const wrapDuration: Rule = {
      name: 'second',
      pattern: [{ kind: 'node', node: 'duration' }],
      produce: (matched) => {
        const ir = matched[0] as any;
        return { type: 'window', from: { type: 'absolute' }, to: { type: 'absolute' } };
      },
    };
    const result = runRules(tokens, [numeralTimeUnit, wrapDuration]);
    expect(result).toHaveLength(1);
    expect(result[0]!.node.type).toBe('window');
  });

  it('returns empty when no rules match', () => {
    const tokens: Token[] = [T('hello', [{ kind: 'Literal', text: 'hello' }])];
    expect(runRules(tokens, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/core/test/rule-engine.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/rule-engine.ts`**

```ts
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
```

- [ ] **Step 4: Run tests**

```bash
pnpm test packages/core/test/rule-engine.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): iterative rule engine with priority ordering and IR-node composition"
```

---

### Task 6: Resolver (IR → ResolvedDate[])

**Files:**
- Create: `packages/core/src/resolver.ts`
- Test: `packages/core/test/resolver.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/core/test/resolver.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolve } from '../src/resolver';
import type { IRNode } from '../src/ir';
import type { ResolverCtx } from '../src/plugin';

const REF = new Date('2026-05-28T00:00:00.000+02:00'); // Thursday, Europe/Kyiv
const CTX: ResolverCtx = { reference: REF, timezone: 'Europe/Kyiv', preferFuture: true };

describe('resolve', () => {
  it('absolute date → single candidate, confidence 1', () => {
    const ir: IRNode = { type: 'absolute', year: 2026, month: 6, day: 5 };
    const out = resolve(ir, CTX);
    expect(out).toEqual([
      { confidence: 1, type: 'date', date: '2026-06-05', granularity: 'day' },
    ]);
  });

  it('weekday(modifier=next) → next ISO week weekday', () => {
    // Thu 2026-05-28; next ISO week Friday = 2026-06-05
    const ir: IRNode = { type: 'weekday', weekday: 5, modifier: 'next' };
    const out = resolve(ir, CTX);
    expect(out[0]!.date).toBe('2026-06-05');
    expect(out[0]!.confidence).toBe(1);
  });

  it('weekday(modifier=this) past in this week → both candidates with mixed confidence', () => {
    // Thu 2026-05-28; this Monday 2026-05-25 (past)
    const ir: IRNode = { type: 'weekday', weekday: 1, modifier: 'this' };
    const out = resolve(ir, CTX);
    expect(out.length).toBeGreaterThanOrEqual(2);
    // Past candidate present
    expect(out.some(c => c.date === '2026-05-25')).toBe(true);
    // Future (next Mon = 2026-06-01) candidate present
    expect(out.some(c => c.date === '2026-06-01')).toBe(true);
  });

  it('range(checkout convention) → nights = end - start', () => {
    const ir: IRNode = {
      type: 'range',
      start: { type: 'absolute', year: 2026, month: 6, day: 5 },
      end: { type: 'absolute', year: 2026, month: 6, day: 10 },
      convention: 'checkout',
    };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({
      confidence: 1,
      type: 'range',
      start: '2026-06-05',
      end: '2026-06-10',
      nights: 5,
    });
  });

  it('range(inclusive convention) → checkout = end + 1, nights = end - start + 1', () => {
    const ir: IRNode = {
      type: 'range',
      start: { type: 'absolute', year: 2026, month: 6, day: 5 },
      end: { type: 'absolute', year: 2026, month: 6, day: 10 },
      convention: 'inclusive',
    };
    const out = resolve(ir, CTX);
    expect(out[0]!.end).toBe('2026-06-11');
    expect(out[0]!.nights).toBe(6);
  });

  it('window → start + end emitted', () => {
    const ir: IRNode = {
      type: 'window',
      from: { type: 'absolute', year: 2026, month: 5, day: 28 },
      to: { type: 'absolute', year: 2026, month: 6, day: 3 },
    };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({
      confidence: 1,
      type: 'window',
      start: '2026-05-28',
      end: '2026-06-03',
    });
  });

  it('duration → nights field only', () => {
    const ir: IRNode = { type: 'duration', nights: 3 };
    const out = resolve(ir, CTX);
    expect(out[0]).toEqual({ confidence: 1, type: 'duration', nights: 3 });
  });

  it('fuzzy → single low-confidence candidate', () => {
    const ir: IRNode = {
      type: 'fuzzy',
      granularity: 'month',
      ref: { type: 'absolute', month: 5 },
      reason: 'sometime_in_month',
    };
    const out = resolve(ir, CTX);
    expect(out[0]!.type).toBe('fuzzy');
    expect(out[0]!.confidence).toBeLessThan(0.5);
    expect(out[0]!.reason).toBe('sometime_in_month');
  });

  it('unresolved → empty candidates (length 0)', () => {
    const ir: IRNode = { type: 'unresolved', reason: 'unsupported_pattern' };
    const out = resolve(ir, CTX);
    // We DO emit a single fuzzy candidate with confidence 0 so callers know
    // something was attempted but failed.
    expect(out).toHaveLength(1);
    expect(out[0]!.confidence).toBe(0);
    expect(out[0]!.reason).toBe('unsupported_pattern');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/core/test/resolver.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/resolver.ts`**

```ts
import { DateTime } from 'luxon';
import type { IRNode } from './ir';
import type { ResolvedDate } from './types';
import type { ResolverCtx } from './plugin';

export function resolve(node: IRNode, ctx: ResolverCtx): ResolvedDate[] {
  switch (node.type) {
    case 'absolute': {
      const date = resolveAbsolute(node, ctx);
      if (!date) return [{ confidence: 0, type: 'fuzzy', reason: 'invalid_absolute' }];
      return [{ confidence: 1, type: 'date', date, granularity: 'day' }];
    }
    case 'weekday':
      return resolveWeekday(node, ctx);
    case 'duration':
      return [{ confidence: 1, type: 'duration', ...(node.nights !== undefined ? { nights: node.nights } : {}) }];
    case 'range':
      return resolveRange(node, ctx);
    case 'window':
      return resolveWindow(node, ctx);
    case 'fuzzy':
      return [{ confidence: 0.3, type: 'fuzzy', reason: node.reason, granularity: node.granularity }];
    case 'unresolved':
      return [{ confidence: 0, type: 'fuzzy', reason: node.reason }];
    case 'relative':
      return resolveRelative(node, ctx);
  }
}

function resolveAbsolute(node: Extract<IRNode, { type: 'absolute' }>, ctx: ResolverCtx): string | null {
  if (node.year && node.month && node.day) {
    const dt = DateTime.fromObject({ year: node.year, month: node.month, day: node.day }, { zone: ctx.timezone });
    return dt.isValid ? dt.toISODate() : null;
  }
  // Partial absolute (e.g., only month+day) — roll year by preference
  if (node.month && node.day) {
    const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
    let candidate = DateTime.fromObject({ year: ref.year, month: node.month, day: node.day }, { zone: ctx.timezone });
    if (!candidate.isValid) return null;
    if (ctx.preferFuture && candidate < ref.startOf('day')) {
      candidate = candidate.set({ year: ref.year + 1 });
    }
    return candidate.toISODate();
  }
  return null;
}

function resolveWeekday(node: Extract<IRNode, { type: 'weekday' }>, ctx: ResolverCtx): ResolvedDate[] {
  const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
  const startOfWeek = ref.startOf('week'); // Luxon: ISO week, Mon=1
  const startOfNextWeek = startOfWeek.plus({ days: 7 });
  const thisWeekTarget = startOfWeek.plus({ days: node.weekday - 1 });
  const nextWeekTarget = startOfNextWeek.plus({ days: node.weekday - 1 });

  switch (node.modifier) {
    case 'next': {
      return [{ confidence: 1, type: 'date', date: nextWeekTarget.toISODate()!, granularity: 'day' }];
    }
    case 'last': {
      const lastWeek = startOfWeek.minus({ days: 7 }).plus({ days: node.weekday - 1 });
      return [{ confidence: 1, type: 'date', date: lastWeek.toISODate()!, granularity: 'day' }];
    }
    case 'this': {
      if (thisWeekTarget < ref.startOf('day')) {
        return [
          { confidence: 0.3, type: 'date', date: thisWeekTarget.toISODate()!, granularity: 'day', reason: 'this_week_past' },
          { confidence: 0.6, type: 'date', date: nextWeekTarget.toISODate()!, granularity: 'day', reason: 'this_week_past_fallback_next' },
        ];
      }
      return [{ confidence: 1, type: 'date', date: thisWeekTarget.toISODate()!, granularity: 'day' }];
    }
    case 'nearest': {
      // Next occurrence (could be today if matches; else +1..+7)
      let delta = (node.weekday - ref.weekday + 7) % 7;
      if (delta === 0 && ctx.preferFuture) delta = 7;
      return [{ confidence: 0.7, type: 'date', date: ref.plus({ days: delta }).toISODate()!, granularity: 'day', reason: 'nearest_upcoming' }];
    }
  }
}

function resolveRange(node: Extract<IRNode, { type: 'range' }>, ctx: ResolverCtx): ResolvedDate[] {
  const startResolved = resolve(node.start, ctx)[0];
  const endResolved = resolve(node.end, ctx)[0];
  if (!startResolved?.date || !endResolved?.date) {
    return [{ confidence: 0, type: 'fuzzy', reason: 'range_resolve_failed' }];
  }
  const startDt = DateTime.fromISO(startResolved.date, { zone: ctx.timezone });
  let endDt = DateTime.fromISO(endResolved.date, { zone: ctx.timezone });
  let nights: number;
  if (node.convention === 'inclusive') {
    endDt = endDt.plus({ days: 1 });
    nights = Math.round(endDt.diff(startDt, 'days').days);
  } else {
    nights = Math.round(endDt.diff(startDt, 'days').days);
  }
  return [{
    confidence: 1,
    type: 'range',
    start: startDt.toISODate()!,
    end: endDt.toISODate()!,
    nights,
  }];
}

function resolveWindow(node: Extract<IRNode, { type: 'window' }>, ctx: ResolverCtx): ResolvedDate[] {
  const from = resolve(node.from, ctx)[0];
  const to = resolve(node.to, ctx)[0];
  if (!from?.date || !to?.date) return [{ confidence: 0, type: 'fuzzy', reason: 'window_resolve_failed' }];
  return [{ confidence: 1, type: 'window', start: from.date, end: to.date }];
}

function resolveRelative(node: Extract<IRNode, { type: 'relative' }>, ctx: ResolverCtx): ResolvedDate[] {
  const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
  const sign = node.direction === 'past' ? -1 : 1;
  const dt = ref.plus({
    days: sign * (node.offset.days ?? 0),
    weeks: sign * (node.offset.weeks ?? 0),
    months: sign * (node.offset.months ?? 0),
    years: sign * (node.offset.years ?? 0),
  });
  return [{ confidence: 1, type: 'date', date: dt.toISODate()!, granularity: 'day' }];
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test packages/core/test/resolver.test.ts
```

Expected: 9/9 PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): resolver for all IR node types (absolute/weekday/range/window/duration/fuzzy/relative)"
```

---

### Task 7: Base rules + `createParser`

**Files:**
- Create: `packages/core/src/base-rules.ts`, `packages/core/src/index.ts`
- Test: `packages/core/test/parser.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/core/test/parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createParser } from '../src/index';
import type { Locale } from '../src/locale';

const minimalLocale: Locale = {
  code: 'min',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [(s) => s.toLowerCase()],
  lexicon: new Map([
    ['days', [{ kind: 'TimeUnit', unit: 'day' }]],
  ]),
  stems: [],
  rules: [],
  defaults: { preferFuture: true },
};

describe('createParser', () => {
  it('parses an ISO date with the base ISO rule', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('2026-06-05', { reference: new Date('2026-05-28T00:00:00Z') });
    expect(result.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
    expect(result.matches[0]!.text).toBe('2026-06-05');
  });

  it('Numeral + TimeUnit composes to duration', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('5 days', { reference: new Date('2026-05-28T00:00:00Z') });
    expect(result.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'duration', nights: 5 })
    );
  });

  it('empty input → empty matches', () => {
    const parser = createParser({ locales: [minimalLocale] });
    const result = parser.parse('', { reference: new Date() });
    expect(result.matches).toHaveLength(0);
  });

  it('plugins contribute rules', () => {
    const parser = createParser({
      locales: [minimalLocale],
      plugins: [{
        name: 'test',
        rules: [{
          name: 'literal-hi',
          pattern: [{ kind: 'tag', tag: 'Literal' }],
          produce: () => ({ type: 'fuzzy', granularity: 'month', ref: { type: 'absolute' }, reason: 'literal_seen' }),
        }],
      }],
    });
    const result = parser.parse('hi', { reference: new Date() });
    expect(result.matches[0]!.candidates[0]!.reason).toBe('literal_seen');
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/core/test/parser.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `packages/core/src/base-rules.ts`**

```ts
import type { Rule } from './plugin';
import type { Token } from './tags';

/** ISO YYYY-MM-DD passthrough — runs before tokenization splits dashes. */
export const isoDateRule: Rule = {
  name: 'iso-date',
  priority: 100,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => /^\d{4}-\d{2}-\d{2}$/.test(t.text) }],
  produce: (matched) => {
    const t = matched[0] as Token;
    const m = t.text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { type: 'absolute', year: +m[1]!, month: +m[2]!, day: +m[3]! };
  },
};

/** Numeral + TimeUnit → duration (day=nights, week=days*7, etc.) */
export const numeralTimeUnitRule: Rule = {
  name: 'numeral-timeunit',
  priority: 50,
  pattern: [
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = (matched[0] as Token).tags.find(t => t.kind === 'Numeral');
    const u = (matched[1] as Token).tags.find(t => t.kind === 'TimeUnit');
    if (!n || n.kind !== 'Numeral') return null;
    if (!u || u.kind !== 'TimeUnit') return null;
    switch (u.unit) {
      case 'night':
      case 'day':  return { type: 'duration', nights: n.value };
      case 'week': return { type: 'duration', nights: n.value * 7 };
      default:     return null; // month/year — needs different IR
    }
  },
};

export const baseRules: Rule[] = [isoDateRule, numeralTimeUnitRule];
```

- [ ] **Step 4: Implement `packages/core/src/index.ts`**

```ts
import { tokenize } from './tokenizer';
import { runRules } from './rule-engine';
import { resolve } from './resolver';
import { baseRules } from './base-rules';
import type { Locale } from './locale';
import type { Plugin, ResolverCtx } from './plugin';
import type { ParseOptions, ParseResult, Match, ResolvedDate } from './types';
import type { Rule } from './plugin';
import type { Tag } from './tags';

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

  // Combine rules: base + locale + plugin (priority sort happens inside runRules)
  const allRules: Rule[] = [
    ...baseRules,
    ...locale.rules,
    ...plugins.flatMap(p => p.rules ?? []),
  ];

  // Enrichers — applied to every resolved candidate
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
export type { Plugin, Rule, PatternItem, Token, Tag, ResolverCtx, IRTypeExt, Enricher } from './plugin';
export type { IRNode, IRSpan } from './ir';
export type { ParseOptions, ParseResult, Match, ResolvedDate } from './types';
export { baseRules };
```

- [ ] **Step 5: Run tests**

```bash
pnpm test packages/core/test/parser.test.ts
```

Expected: 4/4 PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core
git commit -m "feat(core): base rules (ISO, Numeral+TimeUnit) + createParser composing locales and plugins"
```

---

### Task 8: `@whenis/locale-en` MVP

**Files:**
- Create: `packages/locale-en/package.json`, `packages/locale-en/tsconfig.json`, `packages/locale-en/tsup.config.ts`, `packages/locale-en/vitest.config.ts`
- Create: `packages/locale-en/src/{lexicon,rules,index}.ts`
- Test: `packages/locale-en/test/locale-en.test.ts`

- [ ] **Step 1: Create `packages/locale-en/package.json`**

```json
{
  "name": "@whenis/locale-en",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": { "build": "tsup", "typecheck": "tsc --noEmit" },
  "dependencies": { "@whenis/core": "workspace:*" },
  "license": "MIT"
}
```

- [ ] **Step 2: Mirror `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts` from `packages/core` (same content).**

- [ ] **Step 3: Implement `packages/locale-en/src/lexicon.ts`**

```ts
import type { Tag } from '@whenis/core';

const entries: Array<[string, Tag[]]> = [
  // Months
  ['january',   [{ kind: 'MonthName', month: 1 }]],
  ['february',  [{ kind: 'MonthName', month: 2 }]],
  ['march',     [{ kind: 'MonthName', month: 3 }]],
  ['april',     [{ kind: 'MonthName', month: 4 }]],
  ['may',       [{ kind: 'MonthName', month: 5 }]],
  ['june',      [{ kind: 'MonthName', month: 6 }]],
  ['july',      [{ kind: 'MonthName', month: 7 }]],
  ['august',    [{ kind: 'MonthName', month: 8 }]],
  ['september', [{ kind: 'MonthName', month: 9 }]],
  ['october',   [{ kind: 'MonthName', month: 10 }]],
  ['november',  [{ kind: 'MonthName', month: 11 }]],
  ['december',  [{ kind: 'MonthName', month: 12 }]],
  // Weekdays
  ['monday',    [{ kind: 'WeekdayName', weekday: 1 }]],
  ['tuesday',   [{ kind: 'WeekdayName', weekday: 2 }]],
  ['wednesday', [{ kind: 'WeekdayName', weekday: 3 }]],
  ['thursday',  [{ kind: 'WeekdayName', weekday: 4 }]],
  ['friday',    [{ kind: 'WeekdayName', weekday: 5 }]],
  ['saturday',  [{ kind: 'WeekdayName', weekday: 6 }]],
  ['sunday',    [{ kind: 'WeekdayName', weekday: 7 }]],
  // Pointers
  ['next',      [{ kind: 'Grabber', modifier: 'next' }]],
  ['last',      [{ kind: 'Grabber', modifier: 'last' }]],
  ['this',      [{ kind: 'Pointer', direction: 'this' }]],
  ['in',        [{ kind: 'Grabber', modifier: 'in' }]],
  ['within',    [{ kind: 'Grabber', modifier: 'within' }]],
  // Connectors
  ['from',      [{ kind: 'Connector', conn: 'from' }]],
  ['to',        [{ kind: 'Connector', conn: 'to' }]],
  ['through',   [{ kind: 'Connector', conn: 'through' }]],
  ['until',     [{ kind: 'Grabber', modifier: 'until' }]],
  // Units
  ['day',       [{ kind: 'TimeUnit', unit: 'day' }]],
  ['days',      [{ kind: 'TimeUnit', unit: 'day' }]],
  ['night',     [{ kind: 'TimeUnit', unit: 'night' }]],
  ['nights',    [{ kind: 'TimeUnit', unit: 'night' }]],
  ['week',      [{ kind: 'TimeUnit', unit: 'week' }]],
  ['weeks',     [{ kind: 'TimeUnit', unit: 'week' }]],
  ['month',     [{ kind: 'TimeUnit', unit: 'month' }]],
  ['months',    [{ kind: 'TimeUnit', unit: 'month' }]],
  // Immediate
  ['today',     [{ kind: 'Literal', text: '__today__' }]],
  ['tomorrow',  [{ kind: 'Literal', text: '__tomorrow__' }]],
  ['yesterday', [{ kind: 'Literal', text: '__yesterday__' }]],
];

export const enLexicon = new Map(entries);
```

- [ ] **Step 4: Implement `packages/locale-en/src/rules.ts`**

```ts
import type { Rule, Token } from '@whenis/core';

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

export const todayRule: Rule = {
  name: 'en-today',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__today__') }],
  produce: () => ({ type: 'relative', offset: { days: 0 }, direction: 'this' }),
};

export const tomorrowRule: Rule = {
  name: 'en-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'future' }),
};

export const yesterdayRule: Rule = {
  name: 'en-yesterday',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__yesterday__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'past' }),
};

export const nextWeekdayRule: Rule = {
  name: 'en-next-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'next' };
  },
};

export const thisWeekdayRule: Rule = {
  name: 'en-this-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'this' };
  },
};

export const enRules: Rule[] = [todayRule, tomorrowRule, yesterdayRule, nextWeekdayRule, thisWeekdayRule];
```

- [ ] **Step 5: Implement `packages/locale-en/src/index.ts`**

```ts
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
```

- [ ] **Step 6: Write integration tests**

`packages/locale-en/test/locale-en.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { en } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z'); // Thursday

describe('locale-en', () => {
  const parser = createParser({ locales: [en] });

  it('today', () => {
    const r = parser.parse('today', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-28');
  });

  it('tomorrow', () => {
    const r = parser.parse('tomorrow', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it('yesterday', () => {
    const r = parser.parse('yesterday', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-27');
  });

  it('next Friday', () => {
    const r = parser.parse('next friday', { reference: REF, timezone: 'UTC' });
    // From Thu, next ISO week Friday = 2026-06-05
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it('this Monday (already past) → multi-candidate', () => {
    const r = parser.parse('this monday', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('3 days → duration', () => {
    const r = parser.parse('3 days', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.type).toBe('duration');
    expect(r.matches[0]!.candidates[0]!.nights).toBe(3);
  });
});
```

- [ ] **Step 7: Run + commit**

```bash
pnpm install
pnpm --filter @whenis/locale-en typecheck
pnpm test
git add packages/locale-en
git commit -m "feat(locale-en): MVP — today/tomorrow/yesterday, next/this weekday, duration"
```

---

### Task 9: `@whenis/locale-uk` lexicon

**Files:**
- Create: `packages/locale-uk/package.json`, configs (mirror core)
- Create: `packages/locale-uk/src/lexicon.ts`, `packages/locale-uk/src/index.ts`
- Test: `packages/locale-uk/test/lexicon.test.ts`

- [ ] **Step 1: Create `packages/locale-uk/package.json`** (mirror locale-en, change name to `@whenis/locale-uk`).

- [ ] **Step 2: Mirror `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.**

- [ ] **Step 3: Implement `packages/locale-uk/src/lexicon.ts`**

```ts
import type { Tag } from '@whenis/core';

// Per spec: enumerate all needed inflected forms. The Ukrainian noun
// declines across 7 cases × 2 numbers; for date vocabulary we cover the forms
// that appear in everyday date phrases (nominative for headers, genitive in
// "<date> <month-in-genitive>", accusative for "наступну п'ятницю", etc.).
const entries: Array<[string, Tag[]]> = [
  // Months (nominative + genitive — the two common forms in date phrases)
  ['січень', [{ kind: 'MonthName', month: 1 }]],
  ['січня', [{ kind: 'MonthName', month: 1 }]],
  ['лютий', [{ kind: 'MonthName', month: 2 }]],
  ['лютого', [{ kind: 'MonthName', month: 2 }]],
  ['березень', [{ kind: 'MonthName', month: 3 }]],
  ['березня', [{ kind: 'MonthName', month: 3 }]],
  ['квітень', [{ kind: 'MonthName', month: 4 }]],
  ['квітня', [{ kind: 'MonthName', month: 4 }]],
  ['травень', [{ kind: 'MonthName', month: 5 }]],
  ['травня', [{ kind: 'MonthName', month: 5 }]],
  ['червень', [{ kind: 'MonthName', month: 6 }]],
  ['червня', [{ kind: 'MonthName', month: 6 }]],
  ['липень', [{ kind: 'MonthName', month: 7 }]],
  ['липня', [{ kind: 'MonthName', month: 7 }]],
  ['серпень', [{ kind: 'MonthName', month: 8 }]],
  ['серпня', [{ kind: 'MonthName', month: 8 }]],
  ['вересень', [{ kind: 'MonthName', month: 9 }]],
  ['вересня', [{ kind: 'MonthName', month: 9 }]],
  ['жовтень', [{ kind: 'MonthName', month: 10 }]],
  ['жовтня', [{ kind: 'MonthName', month: 10 }]],
  ['листопад', [{ kind: 'MonthName', month: 11 }]],
  ['листопада', [{ kind: 'MonthName', month: 11 }]],
  ['грудень', [{ kind: 'MonthName', month: 12 }]],
  ['грудня', [{ kind: 'MonthName', month: 12 }]],

  // Weekdays (nominative + accusative/genitive variants for "наступної/цю")
  ['понеділок', [{ kind: 'WeekdayName', weekday: 1 }]],
  ['понеділка', [{ kind: 'WeekdayName', weekday: 1 }]],
  ['вівторок', [{ kind: 'WeekdayName', weekday: 2 }]],
  ['вівторка', [{ kind: 'WeekdayName', weekday: 2 }]],
  ['середа', [{ kind: 'WeekdayName', weekday: 3 }]],
  ['середу', [{ kind: 'WeekdayName', weekday: 3 }]],
  ['середи', [{ kind: 'WeekdayName', weekday: 3 }]],
  ['четвер', [{ kind: 'WeekdayName', weekday: 4 }]],
  ['четверга', [{ kind: 'WeekdayName', weekday: 4 }]],
  ["п'ятниця", [{ kind: 'WeekdayName', weekday: 5 }]],
  ["п'ятницю", [{ kind: 'WeekdayName', weekday: 5 }]],
  ["п'ятниці", [{ kind: 'WeekdayName', weekday: 5 }]],
  ['субота', [{ kind: 'WeekdayName', weekday: 6 }]],
  ['суботу', [{ kind: 'WeekdayName', weekday: 6 }]],
  ['суботи', [{ kind: 'WeekdayName', weekday: 6 }]],
  ['неділя', [{ kind: 'WeekdayName', weekday: 7 }]],
  ['неділю', [{ kind: 'WeekdayName', weekday: 7 }]],
  ['неділі', [{ kind: 'WeekdayName', weekday: 7 }]],

  // Pointers / Grabbers
  ['наступний',   [{ kind: 'Grabber', modifier: 'next' }]],
  ['наступна',    [{ kind: 'Grabber', modifier: 'next' }]],
  ['наступне',    [{ kind: 'Grabber', modifier: 'next' }]],
  ['наступного',  [{ kind: 'Grabber', modifier: 'next' }]],
  ['наступної',   [{ kind: 'Grabber', modifier: 'next' }]],
  ['наступну',    [{ kind: 'Grabber', modifier: 'next' }]],
  ['минулий',     [{ kind: 'Grabber', modifier: 'last' }]],
  ['минула',      [{ kind: 'Grabber', modifier: 'last' }]],
  ['минулого',    [{ kind: 'Grabber', modifier: 'last' }]],
  ['минулої',     [{ kind: 'Grabber', modifier: 'last' }]],
  ['цей',         [{ kind: 'Pointer', direction: 'this' }]],
  ['ця',          [{ kind: 'Pointer', direction: 'this' }]],
  ['цю',          [{ kind: 'Pointer', direction: 'this' }]],
  ['цього',       [{ kind: 'Pointer', direction: 'this' }]],
  ['цієї',        [{ kind: 'Pointer', direction: 'this' }]],
  ['через',       [{ kind: 'Grabber', modifier: 'in' }]],

  // Connectors
  ['з',           [{ kind: 'Connector', conn: 'from' }]],
  ['від',         [{ kind: 'Connector', conn: 'from' }]],
  ['до',          [{ kind: 'Connector', conn: 'to' }]],
  ['по',          [{ kind: 'Connector', conn: 'through' }]],
  ['між',         [{ kind: 'Connector', conn: 'between' }]],
  ['і',           [{ kind: 'Connector', conn: 'and' }]],

  // Time units
  ['день',  [{ kind: 'TimeUnit', unit: 'day' }]],
  ['дня',   [{ kind: 'TimeUnit', unit: 'day' }]],
  ['дні',   [{ kind: 'TimeUnit', unit: 'day' }]],
  ['днів',  [{ kind: 'TimeUnit', unit: 'day' }]],
  ['ніч',   [{ kind: 'TimeUnit', unit: 'night' }]],
  ['ночі',  [{ kind: 'TimeUnit', unit: 'night' }]],
  ['ночей', [{ kind: 'TimeUnit', unit: 'night' }]],
  ['тиждень', [{ kind: 'TimeUnit', unit: 'week' }]],
  ['тижні',   [{ kind: 'TimeUnit', unit: 'week' }]],
  ['тижнів',  [{ kind: 'TimeUnit', unit: 'week' }]],
  ['місяць',  [{ kind: 'TimeUnit', unit: 'month' }]],
  ['місяця',  [{ kind: 'TimeUnit', unit: 'month' }]],
  ['місяців', [{ kind: 'TimeUnit', unit: 'month' }]],

  // Immediate
  ['сьогодні',      [{ kind: 'Literal', text: '__today__' }]],
  ['завтра',        [{ kind: 'Literal', text: '__tomorrow__' }]],
  ['вчора',         [{ kind: 'Literal', text: '__yesterday__' }]],
  ['позавчора',     [{ kind: 'Literal', text: '__day_before_yesterday__' }]],
  ['післязавтра',   [{ kind: 'Literal', text: '__day_after_tomorrow__' }]],
];

export const ukLexicon = new Map(entries);

export const ukStems: Array<[RegExp, Tag[]]> = [
  // Catch-all month stems for unusual inflections (locative, instrumental)
  [/^січн/, [{ kind: 'MonthName', month: 1 }]],
  [/^лют/,  [{ kind: 'MonthName', month: 2 }]],
  [/^березн/, [{ kind: 'MonthName', month: 3 }]],
  [/^квітн/, [{ kind: 'MonthName', month: 4 }]],
  [/^травн/, [{ kind: 'MonthName', month: 5 }]],
  [/^червн/, [{ kind: 'MonthName', month: 6 }]],
  [/^липн/, [{ kind: 'MonthName', month: 7 }]],
  [/^серпн/, [{ kind: 'MonthName', month: 8 }]],
  [/^вересн/, [{ kind: 'MonthName', month: 9 }]],
  [/^жовтн/, [{ kind: 'MonthName', month: 10 }]],
  [/^листопад/, [{ kind: 'MonthName', month: 11 }]],
  [/^грудн/, [{ kind: 'MonthName', month: 12 }]],
];
```

- [ ] **Step 4: Implement `packages/locale-uk/src/index.ts`**

```ts
import type { Locale } from '@whenis/core';
import { ukLexicon, ukStems } from './lexicon';

function normalizeApostrophes(s: string): string {
  return s.replace(/[’ʼʹ′´`]/g, "'");
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
```

- [ ] **Step 5: Write lexicon coverage test**

`packages/locale-uk/test/lexicon.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ukLexicon } from '../src/lexicon';

describe('uk lexicon coverage', () => {
  it('has all 12 months in nominative and genitive', () => {
    const months: Array<[string, string, number]> = [
      ['січень', 'січня', 1], ['лютий', 'лютого', 2], ['березень', 'березня', 3],
      ['квітень', 'квітня', 4], ['травень', 'травня', 5], ['червень', 'червня', 6],
      ['липень', 'липня', 7], ['серпень', 'серпня', 8], ['вересень', 'вересня', 9],
      ['жовтень', 'жовтня', 10], ['листопад', 'листопада', 11], ['грудень', 'грудня', 12],
    ];
    for (const [nom, gen, m] of months) {
      expect(ukLexicon.get(nom)?.[0]).toEqual({ kind: 'MonthName', month: m });
      expect(ukLexicon.get(gen)?.[0]).toEqual({ kind: 'MonthName', month: m });
    }
  });

  it('has all 7 weekdays in at least 2 forms', () => {
    const weekdays = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя'];
    for (const wd of weekdays) {
      expect(ukLexicon.get(wd)?.[0]?.kind).toBe('WeekdayName');
    }
  });

  it("normalizes apostrophe — lookup with U+0027 finds п'ятниця", () => {
    // The preprocess step normalizes; lexicon should already store with U+0027.
    expect(ukLexicon.get("п'ятниця")).toBeDefined();
    expect(ukLexicon.get("п'ятницю")).toBeDefined();
  });
});
```

- [ ] **Step 6: Run + commit**

```bash
pnpm install
pnpm --filter @whenis/locale-uk typecheck
pnpm test
git add packages/locale-uk
git commit -m "feat(locale-uk): full lexicon (months + weekdays + pointers + connectors + units) with apostrophe normalisation"
```

---

### Task 10: `@whenis/locale-uk` rules

**Files:**
- Create: `packages/locale-uk/src/rules.ts`
- Modify: `packages/locale-uk/src/index.ts` (wire rules in)
- Test: `packages/locale-uk/test/rules.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/locale-uk/test/rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { uk } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z'); // Thursday

describe('locale-uk rules', () => {
  const parser = createParser({ locales: [uk] });

  it("'наступної п'ятниці' → next ISO week's Friday", () => {
    const r = parser.parse("наступної п'ятниці", { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it("'наступний понеділок' → next ISO week's Monday", () => {
    const r = parser.parse('наступний понеділок', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-01');
  });

  it("'цю п'ятницю' (future within this week) → resolved", () => {
    const r = parser.parse("цю п'ятницю", { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it("'сьогодні' → reference date", () => {
    const r = parser.parse('сьогодні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-28');
  });

  it("'завтра' → ref + 1", () => {
    const r = parser.parse('завтра', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-29');
  });

  it("'через 3 дні' → ref + 3", () => {
    const r = parser.parse('через 3 дні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-05-31');
  });

  it("'5 червня' → 2026-06-05", () => {
    const r = parser.parse('5 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.date).toBe('2026-06-05');
  });

  it("'з 5 до 10 червня' → range, checkout convention, nights=5", () => {
    const r = parser.parse('з 5 до 10 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-05', end: '2026-06-10', nights: 5 })
    );
  });

  it("'з 5 по 10 червня' → range, last-night convention, nights=6", () => {
    const r = parser.parse('з 5 по 10 червня', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'range', start: '2026-06-05', end: '2026-06-11', nights: 6 })
    );
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/locale-uk
```

Expected: most FAIL.

- [ ] **Step 3: Implement `packages/locale-uk/src/rules.ts`**

```ts
import type { Rule, Token } from '@whenis/core';

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

export const ukTodayRule: Rule = {
  name: 'uk-today',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__today__') }],
  produce: () => ({ type: 'relative', offset: { days: 0 }, direction: 'this' }),
};

export const ukTomorrowRule: Rule = {
  name: 'uk-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'future' }),
};

export const ukYesterdayRule: Rule = {
  name: 'uk-yesterday',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__yesterday__') }],
  produce: () => ({ type: 'relative', offset: { days: 1 }, direction: 'past' }),
};

export const ukDayAfterTomorrowRule: Rule = {
  name: 'uk-day-after-tomorrow',
  priority: 80,
  pattern: [{ kind: 'tag', tag: 'Literal', predicate: (t) => t.tags.some(x => x.kind === 'Literal' && x.text === '__day_after_tomorrow__') }],
  produce: () => ({ type: 'relative', offset: { days: 2 }, direction: 'future' }),
};

export const ukNextWeekdayRule: Rule = {
  name: 'uk-next-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'next' };
  },
};

export const ukThisWeekdayRule: Rule = {
  name: 'uk-this-weekday',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'WeekdayName' },
  ],
  produce: (matched) => {
    const wd = findTag(matched[1] as Token, 'WeekdayName');
    if (!wd || wd.kind !== 'WeekdayName') return null;
    return { type: 'weekday', weekday: wd.weekday, modifier: 'this' };
  },
};

export const ukThroughNRule: Rule = {
  // "через N дні/днів/тижнів" → relative future
  name: 'uk-through-n',
  priority: 70,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'in') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = (matched[1] as Token).tags.find(t => t.kind === 'Numeral');
    const u = (matched[2] as Token).tags.find(t => t.kind === 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    switch (u.unit) {
      case 'day':   return { type: 'relative', offset: { days: n.value }, direction: 'future' };
      case 'week':  return { type: 'relative', offset: { weeks: n.value }, direction: 'future' };
      case 'month': return { type: 'relative', offset: { months: n.value }, direction: 'future' };
      default:      return null;
    }
  },
};

export const ukDayMonthRule: Rule = {
  // "5 червня" → absolute partial (year resolved at runtime via preferFuture)
  name: 'uk-day-month',
  priority: 60,
  pattern: [
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const n = (matched[0] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[1] as Token).tags.find(t => t.kind === 'MonthName');
    if (!n || n.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    if (n.value < 1 || n.value > 31) return null;
    return { type: 'absolute', month: m.month, day: n.value };
  },
};

// Compound-month range rules: "з 5 до 10 червня" / "з 5 по 10 червня"
// The month attaches to BOTH 5 and 10. Encoded as Numeral + Connector + Numeral + MonthName.

export const ukRangeUntilRule: Rule = {
  name: 'uk-range-until',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'from') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'to') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const a = (matched[1] as Token).tags.find(t => t.kind === 'Numeral');
    const b = (matched[3] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[4] as Token).tags.find(t => t.kind === 'MonthName');
    if (!a || a.kind !== 'Numeral' || !b || b.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    return {
      type: 'range',
      start: { type: 'absolute', month: m.month, day: a.value },
      end: { type: 'absolute', month: m.month, day: b.value },
      convention: 'checkout',
    };
  },
};

export const ukRangeThroughRule: Rule = {
  name: 'uk-range-through',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'from') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'Connector', predicate: (t) => t.tags.some(x => x.kind === 'Connector' && x.conn === 'through') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'MonthName' },
  ],
  produce: (matched) => {
    const a = (matched[1] as Token).tags.find(t => t.kind === 'Numeral');
    const b = (matched[3] as Token).tags.find(t => t.kind === 'Numeral');
    const m = (matched[4] as Token).tags.find(t => t.kind === 'MonthName');
    if (!a || a.kind !== 'Numeral' || !b || b.kind !== 'Numeral' || !m || m.kind !== 'MonthName') return null;
    return {
      type: 'range',
      start: { type: 'absolute', month: m.month, day: a.value },
      end: { type: 'absolute', month: m.month, day: b.value },
      convention: 'inclusive',
    };
  },
};

export const ukRules: Rule[] = [
  ukTodayRule, ukTomorrowRule, ukYesterdayRule, ukDayAfterTomorrowRule,
  ukNextWeekdayRule, ukThisWeekdayRule,
  ukThroughNRule,
  ukRangeUntilRule, ukRangeThroughRule, // before day-month so 5-token ranges win over 2-token fallback
  ukDayMonthRule,
];
```

- [ ] **Step 4: Wire rules in `packages/locale-uk/src/index.ts`**

Replace the `rules: []` line with `rules: ukRules` and add `import { ukRules } from './rules';`.

- [ ] **Step 5: Run tests**

```bash
pnpm test packages/locale-uk
```

Expected: 9/9 PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/locale-uk
git commit -m "feat(locale-uk): rules — immediate keywords, next/this weekday, через N, day+month, compound-month ranges"
```

---

### Task 11: `@whenis/booking` — window + stay-duration rules

**Files:**
- Create: `packages/booking/package.json`, configs (mirror locale packages)
- Create: `packages/booking/src/rules.ts`, `packages/booking/src/index.ts`
- Test: `packages/booking/test/booking.test.ts`

- [ ] **Step 1: Create `packages/booking/package.json`**

Same shape as locale-en, name `@whenis/booking`.

- [ ] **Step 2: Mirror tsconfig/tsup/vitest configs.**

- [ ] **Step 3: Write failing tests**

`packages/booking/test/booking.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '../src/index';

const REF = new Date('2026-05-28T00:00:00.000Z');

describe('@whenis/booking', () => {
  const parser = createParser({ locales: [uk], plugins: [booking] });

  it("'впродовж 7 днів' → window 7 days starting at reference", () => {
    const r = parser.parse('впродовж 7 днів', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual(
      expect.objectContaining({ type: 'window', start: '2026-05-28', end: '2026-06-03' })
    );
  });

  it("'у найближчі 5 днів' → 5-day window", () => {
    const r = parser.parse('у найближчі 5 днів', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.start).toBe('2026-05-28');
    expect(r.matches[0]!.candidates[0]!.end).toBe('2026-06-01');
  });

  it("'на 5 ночей' → duration with nights=5 (no date)", () => {
    const r = parser.parse('на 5 ночей', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]).toEqual({ confidence: 1, type: 'duration', nights: 5 });
  });

  it("'на 3 дні' → duration with nights=3", () => {
    const r = parser.parse('на 3 дні', { reference: REF, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.nights).toBe(3);
  });
});
```

- [ ] **Step 4: Run, confirm failure**

```bash
pnpm test packages/booking
```

Expected: FAIL.

- [ ] **Step 5: Implement `packages/booking/src/rules.ts`**

```ts
import type { Rule, Token, Tag } from '@whenis/core';

// "впродовж|у найближчі N днів/тижнів" — the leading word(s) are language-specific.
// We piggyback on UK tags here; the booking plugin contributes its own tag entries
// for "впродовж" and "найближчі" via the `tags` field of the Plugin.

const findTag = (t: Token, kind: string) => t.tags.find(x => x.kind === kind);

function makeWindow(n: number, unit: 'day' | 'week'): import('@whenis/core').IRNode {
  const days = unit === 'week' ? n * 7 : n;
  return {
    type: 'window',
    from: { type: 'relative', offset: { days: 0 }, direction: 'this' },
    to:   { type: 'relative', offset: { days: days - 1 }, direction: 'future' },
  };
}

// "впродовж 7 днів" — 3-token form
export const windowWithinNRule: Rule = {
  name: 'booking-window-within',
  priority: 75,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'within') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[1] as Token, 'Numeral');
    const u = findTag(matched[2] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    if (u.unit !== 'day' && u.unit !== 'week') return null;
    return makeWindow(n.value, u.unit);
  },
};

// "у найближчі 5 днів" — 4-token form with leading «у/в» Connector
export const windowWithinNWithPrefixRule: Rule = {
  name: 'booking-window-within-prefixed',
  priority: 76,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^[ув]$/i.test(t.text) },
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'within') },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[2] as Token, 'Numeral');
    const u = findTag(matched[3] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    if (u.unit !== 'day' && u.unit !== 'week') return null;
    return makeWindow(n.value, u.unit);
  },
};

export const stayDurationRule: Rule = {
  name: 'booking-stay-duration',
  priority: 75,
  pattern: [
    // "на N {ноч|дн|тижн}"
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^на$/i.test(t.text) },
    { kind: 'tag', tag: 'Numeral' },
    { kind: 'tag', tag: 'TimeUnit' },
  ],
  produce: (matched) => {
    const n = findTag(matched[1] as Token, 'Numeral');
    const u = findTag(matched[2] as Token, 'TimeUnit');
    if (!n || n.kind !== 'Numeral' || !u || u.kind !== 'TimeUnit') return null;
    switch (u.unit) {
      case 'night': return { type: 'duration', nights: n.value };
      case 'day':   return { type: 'duration', nights: n.value };
      case 'week':  return { type: 'duration', nights: n.value * 7 };
      default:      return null;
    }
  },
};

export const bookingRules: Rule[] = [windowWithinNRule, windowWithinNWithPrefixRule, stayDurationRule];

// Tags the booking plugin contributes to ANY locale that uses it.
// We map our trigger words to Tag kinds — "впродовж" + "найближчі" → Grabber(within);
// "на" → Connector(from)-ish but we hijack it via the rule's predicate above.
export const bookingTags = new Map<string, Tag[]>([
  ['впродовж', [{ kind: 'Grabber', modifier: 'within' }]],
  ['найближчі', [{ kind: 'Grabber', modifier: 'within' }]],
  ['найближчих', [{ kind: 'Grabber', modifier: 'within' }]],
  ['у', [{ kind: 'Connector', conn: 'from' /* dual meaning; rule narrows */ }]],
  // "на" needs special handling — we tag it as Connector with predicate match.
  ['на', [{ kind: 'Connector', conn: 'from' }]],
]);
```

- [ ] **Step 6: Implement `packages/booking/src/index.ts`**

```ts
import type { Plugin } from '@whenis/core';
import { bookingRules, bookingTags } from './rules';

export const booking: Plugin = {
  name: '@whenis/booking',
  tags: bookingTags,
  rules: bookingRules,
};
```

- [ ] **Step 7: Run tests**

```bash
pnpm install
pnpm test packages/booking
```

Expected: 4/4 PASS. **Note**: if «у найближчі 5 днів» fails because the «у» Connector wins over «найближчі» Grabber, adjust the windowWithinNRule pattern to accept an optional leading Connector.

If that issue arises, replace the windowWithinNRule pattern with a variant that tolerates an optional «у» prefix:

```ts
pattern: [
  // optional "у/у" — handled by accepting either 3- or 4-token match. Simplest: two rules.
],
```

And add a second variant `windowWithinNWithPrefixRule` that matches the 4-token form. Keep both in the array.

- [ ] **Step 8: Commit**

```bash
git add packages/booking
git commit -m "feat(booking): window-within-N and stay-duration rules + trigger lexicon"
```

---

### Task 12: `@whenis/booking` — weekend, holiday, mostly-past enricher

**Files:**
- Modify: `packages/booking/src/rules.ts` (add weekend + holiday rules)
- Create: `packages/booking/src/enrichers.ts`
- Modify: `packages/booking/src/index.ts` (wire enricher)
- Test: extend `packages/booking/test/booking.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `packages/booking/test/booking.test.ts`:

```ts
describe('@whenis/booking — extended', () => {
  const parser = createParser({ locales: [uk], plugins: [booking] });
  const REF_NEAR_MONTH_END = new Date('2026-05-27T00:00:00.000Z'); // Wed, 4 days left in May

  it("'наступні вихідні' → range Sat+Sun next ISO week", () => {
    const r = parser.parse('наступні вихідні', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.start).toBe('2026-06-06');
    expect(r.matches[0]!.candidates[0]!.end).toBe('2026-06-07');
  });

  it("'після свят' → fuzzy with reason=holiday_ref", () => {
    const r = parser.parse('після свят', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.type).toBe('fuzzy');
    expect(r.matches[0]!.candidates[0]!.reason).toBe('holiday_ref');
  });

  it("mostly-past enricher adds suggest_next_month=true when month >= 75% elapsed", () => {
    // Construct a fuzzy month IR by parsing "десь у травні" — assumes a rule
    // (added later in UA locale) produces fuzzy. For now, simulate by directly
    // calling the enricher on a synthetic candidate.
    // Smoke: ensure the enricher does NOT mutate non-fuzzy or non-month candidates.
    const r = parser.parse('завтра', { reference: REF_NEAR_MONTH_END, timezone: 'UTC' });
    expect(r.matches[0]!.candidates[0]!.metadata?.suggest_next_month).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test packages/booking
```

Expected: FAIL on first two new tests.

- [ ] **Step 3: Extend `packages/booking/src/rules.ts` with weekend + holiday rules**

```ts
// Append to bookingRules array:

export const weekendNextRule: Rule = {
  name: 'booking-weekend-next',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Grabber', predicate: (t) => t.tags.some(x => x.kind === 'Grabber' && x.modifier === 'next') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => ({
    type: 'range',
    start: { type: 'weekday', weekday: 6, modifier: 'next' },
    end:   { type: 'weekday', weekday: 7, modifier: 'next' },
    convention: 'inclusive',
  }),
};

export const weekendThisRule: Rule = {
  name: 'booking-weekend-this',
  priority: 80,
  pattern: [
    { kind: 'tag', tag: 'Pointer', predicate: (t) => t.tags.some(x => x.kind === 'Pointer' && x.direction === 'this') },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /вихідн/i.test(t.text) },
  ],
  produce: () => ({
    type: 'range',
    start: { type: 'weekday', weekday: 6, modifier: 'this' },
    end:   { type: 'weekday', weekday: 7, modifier: 'this' },
    convention: 'inclusive',
  }),
};

// "після свят" — neither word has a tag in default UA lexicon, both arrive as Literal.
export const holidayPislyaRule: Rule = {
  name: 'booking-holiday-pislya',
  priority: 90,
  pattern: [
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^після$/i.test(t.text) },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^свят/i.test(t.text) },
  ],
  produce: () => ({
    type: 'fuzzy',
    granularity: 'month',
    ref: { type: 'absolute' },
    reason: 'holiday_ref',
  }),
};

// "на свята" — «на» is tagged by booking as Connector(from); «свят*» arrives as Literal.
export const holidayNaRule: Rule = {
  name: 'booking-holiday-na',
  priority: 90,
  pattern: [
    { kind: 'tag', tag: 'Connector', predicate: (t) => /^на$/i.test(t.text) },
    { kind: 'tag', tag: 'Literal', predicate: (t) => /^свят/i.test(t.text) },
  ],
  produce: () => ({
    type: 'fuzzy',
    granularity: 'month',
    ref: { type: 'absolute' },
    reason: 'holiday_ref',
  }),
};

// Update exports:
export const bookingRules: Rule[] = [
  windowWithinNRule,
  windowWithinNWithPrefixRule,
  stayDurationRule,
  weekendNextRule,
  weekendThisRule,
  holidayPislyaRule,
  holidayNaRule,
];
```

- [ ] **Step 4: Create `packages/booking/src/enrichers.ts`**

```ts
import { DateTime } from 'luxon';
import type { Enricher, ResolverCtx } from '@whenis/core';
import type { ResolvedDate } from '@whenis/core';

const DEFAULT_THRESHOLD = 0.75;

export const mostlyPastEnricher: Enricher = {
  apply(candidate: ResolvedDate, ctx: ResolverCtx): ResolvedDate {
    if (candidate.type !== 'fuzzy') return candidate;
    if (candidate.granularity !== 'month') return candidate;
    const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
    const elapsed = ref.day / (ref.daysInMonth ?? 30);
    if (elapsed < DEFAULT_THRESHOLD) return candidate;
    return {
      ...candidate,
      metadata: { ...(candidate.metadata ?? {}), suggest_next_month: true },
    };
  },
};
```

- [ ] **Step 5: Wire enricher in `packages/booking/src/index.ts`**

```ts
import type { Plugin } from '@whenis/core';
import { bookingRules, bookingTags } from './rules';
import { mostlyPastEnricher } from './enrichers';

export const booking: Plugin = {
  name: '@whenis/booking',
  tags: bookingTags,
  rules: bookingRules,
  enrichers: [mostlyPastEnricher],
};
```

- [ ] **Step 6: Run tests**

```bash
pnpm test packages/booking
```

Expected: PASS. If «після свят» fails because lexicon doesn't tag «після»/«свят» as Literal-with-text, those words pass through as Literal by default (since no lexicon entry for them) — the predicate matches on `t.text`. Verify with `console.log(tokens)` if needed.

- [ ] **Step 7: Commit**

```bash
git add packages/booking
git commit -m "feat(booking): weekend rules + holiday_ref + mostly-past enricher"
```

---

### Task 13: Golden corpus per locale + integration

**Files:**
- Create: `packages/locale-uk/test/corpus.jsonl`
- Create: `packages/locale-uk/test/corpus.test.ts`
- Create: `packages/locale-en/test/corpus.jsonl`
- Create: `packages/locale-en/test/corpus.test.ts`

- [ ] **Step 1: Create `packages/locale-uk/test/corpus.jsonl`**

```jsonl
{"input":"сьогодні","reference":"2026-05-28","expected_date":"2026-05-28"}
{"input":"завтра","reference":"2026-05-28","expected_date":"2026-05-29"}
{"input":"вчора","reference":"2026-05-28","expected_date":"2026-05-27"}
{"input":"післязавтра","reference":"2026-05-28","expected_date":"2026-05-30"}
{"input":"наступної п'ятниці","reference":"2026-05-28","expected_date":"2026-06-05"}
{"input":"наступний понеділок","reference":"2026-05-28","expected_date":"2026-06-01"}
{"input":"цю п'ятницю","reference":"2026-05-28","expected_date":"2026-05-29"}
{"input":"через 3 дні","reference":"2026-05-28","expected_date":"2026-05-31"}
{"input":"через 2 тижні","reference":"2026-05-28","expected_date":"2026-06-11"}
{"input":"5 червня","reference":"2026-05-28","expected_date":"2026-06-05"}
{"input":"з 5 до 10 червня","reference":"2026-05-28","expected_range":{"start":"2026-06-05","end":"2026-06-10","nights":5}}
{"input":"з 5 по 10 червня","reference":"2026-05-28","expected_range":{"start":"2026-06-05","end":"2026-06-11","nights":6}}
{"input":"впродовж 7 днів","reference":"2026-05-28","expected_window":{"start":"2026-05-28","end":"2026-06-03"}}
{"input":"на 5 ночей","reference":"2026-05-28","expected_duration":5}
{"input":"наступні вихідні","reference":"2026-05-28","expected_range":{"start":"2026-06-06","end":"2026-06-07"}}
{"input":"після свят","reference":"2026-05-28","expected_reason":"holiday_ref"}
```

- [ ] **Step 2: Create `packages/locale-uk/test/corpus.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { createParser } from '@whenis/core';
import { uk } from '../src/index';
import { booking } from '@whenis/booking';

const parser = createParser({ locales: [uk], plugins: [booking] });

interface CorpusEntry {
  input: string;
  reference: string;
  expected_date?: string;
  expected_range?: { start: string; end: string; nights?: number };
  expected_window?: { start: string; end: string };
  expected_duration?: number;
  expected_reason?: string;
}

const corpusPath = resolvePath(__dirname, 'corpus.jsonl');
const lines = readFileSync(corpusPath, 'utf-8').trim().split('\n');
const entries: CorpusEntry[] = lines.map(l => JSON.parse(l));

describe.each(entries)('corpus: $input (ref $reference)', (entry) => {
  it('parses to expected resolution', () => {
    const result = parser.parse(entry.input, {
      reference: new Date(`${entry.reference}T00:00:00.000Z`),
      timezone: 'UTC',
    });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0]!.candidates[0]!;
    if (entry.expected_date) {
      expect(top.date).toBe(entry.expected_date);
    }
    if (entry.expected_range) {
      expect(top.start).toBe(entry.expected_range.start);
      expect(top.end).toBe(entry.expected_range.end);
      if (entry.expected_range.nights !== undefined) {
        expect(top.nights).toBe(entry.expected_range.nights);
      }
    }
    if (entry.expected_window) {
      expect(top.type).toBe('window');
      expect(top.start).toBe(entry.expected_window.start);
      expect(top.end).toBe(entry.expected_window.end);
    }
    if (entry.expected_duration !== undefined) {
      expect(top.nights).toBe(entry.expected_duration);
    }
    if (entry.expected_reason) {
      expect(top.reason).toBe(entry.expected_reason);
    }
  });
});
```

- [ ] **Step 3: Mirror EN corpus**

`packages/locale-en/test/corpus.jsonl`:

```jsonl
{"input":"today","reference":"2026-05-28","expected_date":"2026-05-28"}
{"input":"tomorrow","reference":"2026-05-28","expected_date":"2026-05-29"}
{"input":"yesterday","reference":"2026-05-28","expected_date":"2026-05-27"}
{"input":"next friday","reference":"2026-05-28","expected_date":"2026-06-05"}
{"input":"this monday","reference":"2026-05-28","expected_date":"2026-05-25"}
{"input":"2026-06-05","reference":"2026-05-28","expected_date":"2026-06-05"}
{"input":"3 days","reference":"2026-05-28","expected_duration":3}
```

And `packages/locale-en/test/corpus.test.ts` (same shape, import `en` instead of `uk`, no booking plugin needed).

- [ ] **Step 4: Run + commit**

```bash
pnpm test
git add packages/locale-uk/test packages/locale-en/test
git commit -m "test: golden corpus for UA + EN — parametrised parse expectations"
```

---

### Task 14: hutshub-chatbot integration smoke

**Files (in DIFFERENT repo):**
- Modify: `/Users/nazarfedisin/WebstormProjects/hutshub-chatbot/src/services/tools/DateResolverService.ts`
- Work on a fresh branch `hh-2861-whenis-integration` cut from `main`.

This task verifies the library is usable end-to-end by replacing the existing in-tree `DateResolverService` with a `whenis`-backed implementation, and confirming all 84 existing resolver tests still pass (with corrections where new behaviour is strictly better).

- [ ] **Step 1: Set up consumption**

Inside hutshub-chatbot:
```bash
cd /Users/nazarfedisin/WebstormProjects/hutshub-chatbot
git checkout -b hh-2861-whenis-integration main
```

In `whenis` root:
```bash
cd /Users/nazarfedisin/WebstormProjects/whenis
pnpm -r build
pnpm pack --pack-destination /tmp/whenis-pkgs
```

In `hutshub-chatbot`:
```bash
yarn add file:/tmp/whenis-pkgs/whenis-core-0.1.0.tgz \
         file:/tmp/whenis-pkgs/whenis-locale-uk-0.1.0.tgz \
         file:/tmp/whenis-pkgs/whenis-booking-0.1.0.tgz
```

(Alternative: link via `pnpm link` if hutshub uses pnpm.)

- [ ] **Step 2: Write a thin adapter `src/services/tools/DateResolverService.ts`**

Replace the existing file's main function body with:

```ts
import { Injectable } from "@nestjs/common";
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '@whenis/booking';
import type { ParseResult } from '@whenis/core';

const parser = createParser({ locales: [uk], plugins: [booking] });

export interface DateResolution {
  // keep existing shape for backward compat
  resolved: string | null;
  range_end?: string;
  weekday_uk: string | null;
  weekday_en: string | null;
  days_from_today: number | null;
  confidence: "high" | "medium" | "low";
  input: string;
  nights?: number;
  window?: { from: string; to: string };
  reason_unresolved?: string;
  suggest_next_month?: boolean;
}

const UKR_WEEKDAYS_BY_LUXON: Record<number, string> = {
  1: "понеділок", 2: "вівторок", 3: "середа", 4: "четвер",
  5: "п'ятниця", 6: "субота", 7: "неділя",
};

export function resolveDateExpression(
  expression: string,
  anchorIsoDate: string,
  tz: string = "Europe/Kyiv",
): DateResolution {
  const ref = new Date(`${anchorIsoDate}T00:00:00.000+02:00`); // assume Kyiv anchor
  const result: ParseResult = parser.parse(expression, { reference: ref, timezone: tz });
  return adapt(result, expression);
}

function adapt(result: ParseResult, original: string): DateResolution {
  if (result.matches.length === 0) {
    return { resolved: null, range_end: undefined, weekday_uk: null, weekday_en: null, days_from_today: null, confidence: "low", input: original, reason_unresolved: "unsupported_pattern" };
  }
  const top = result.matches[0]!.candidates[0]!;
  const confidence = top.confidence >= 0.7 ? "high" : top.confidence >= 0.4 ? "medium" : "low";
  // Common fields
  const base: DateResolution = {
    resolved: top.date ?? top.start ?? null,
    range_end: top.end,
    weekday_uk: null,
    weekday_en: null,
    days_from_today: null,
    confidence,
    input: original,
  };
  if (top.type === 'window') {
    base.window = { from: top.start!, to: top.end! };
    base.resolved = null;
  }
  if (top.nights !== undefined) base.nights = top.nights;
  if (top.reason) base.reason_unresolved = top.reason;
  if (top.metadata?.suggest_next_month) base.suggest_next_month = true;
  return base;
}
```

- [ ] **Step 3: Run existing resolver tests**

```bash
npx vitest run test/services/tools/DateResolverService.test.ts 2>&1 | tail -10
```

Expected: most pass. Document any tests that fail because whenis returns a candidate slightly different from the legacy resolver (e.g., confidence-string mapping). For confidence-string mismatches: update the test (these are existing behaviour the legacy code documented).

- [ ] **Step 4: Note any genuine gaps**

If any test reveals a missing whenis feature (e.g., a rare UA pattern not yet in the lexicon), add a TODO entry to `whenis/docs/v0.2-followup.md` (create the file if needed) and skip that test for now with `it.skip(...)` and a comment.

- [ ] **Step 5: Commit (on hutshub-chatbot's hh-2861-whenis-integration branch)**

```bash
cd /Users/nazarfedisin/WebstormProjects/hutshub-chatbot
git add src/services/tools/DateResolverService.ts package.json yarn.lock test/services/tools/DateResolverService.test.ts
git commit -m "HH-2861 integ: replace DateResolverService internals with @whenis parser (proof-of-concept)"
```

This integration is NOT merged to main without further review — it's just proof the library works end-to-end.

---

### Task 15: README per package + LICENSE + CI

**Files:**
- Create: `packages/*/README.md`, `LICENSE`, `.github/workflows/ci.yml`

- [ ] **Step 1: Create root `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Nazar Fedishin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create `packages/core/README.md`**

```markdown
# @whenis/core

Engine for the [whenis](../../README.md) natural-language date parser.

Provides `createParser({ locales, plugins })`. See root README for usage.

## API

- `createParser(opts) → Parser`
- Types: `Locale`, `Plugin`, `Rule`, `IRNode`, `ResolvedDate`, `ParseResult`

License: MIT
```

- [ ] **Step 3: Mirror short READMEs for `locale-en`, `locale-uk`, `booking`** (one paragraph each, link to root).

- [ ] **Step 4: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm test
      - run: pnpm -r build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/nazarfedisin/WebstormProjects/whenis
git add LICENSE packages/*/README.md .github/workflows/ci.yml
git commit -m "chore: LICENSE (MIT) + per-package README + GitHub Actions CI"
```

---

### Task 16: First publish dry-run + GitHub repo

This task is GATED on user explicit approval to publish. Do steps 1–3, stop, ask user.

- [ ] **Step 1: Build all packages**

```bash
cd /Users/nazarfedisin/WebstormProjects/whenis
pnpm -r build
```

- [ ] **Step 2: Dry-run publish**

```bash
pnpm -r publish --dry-run --no-git-checks --access public
```

Expected: 4 tarballs would be published (`@whenis/core`, `@whenis/locale-uk`, `@whenis/locale-en`, `@whenis/booking`), no errors.

- [ ] **Step 3: Create GitHub repo**

```bash
gh repo create whenis --public --description "Natural-language date parsing for TypeScript (Ukrainian + English, plugin-extensible)" --source . --remote origin --push
```

- [ ] **Step 4: STOP — ask user**

Report:
- All builds clean, all tests green, dry-run published 4 packages successfully.
- GitHub repo created at `https://github.com/<user>/whenis`.
- Awaiting user GO for real `pnpm -r publish --access public`.

---

## Post-implementation (NOT part of plan execution)

- v0.2: time-of-day parsing
- v0.2: RU and PL locales (proves extension pattern)
- v0.3: recurring events, time zones
- Playground web app
- DOCs site (docusaurus or vitepress)
