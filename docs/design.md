# whenis — design

**Date:** 2026-05-28
**Status:** Draft / awaiting approval
**License:** MIT (planned)
**Repo:** TBD (local at `~/WebstormProjects/whenis`, push to GitHub when ready)

## Problem

LLM-based assistants need to interpret natural-language dates in user messages: «наступної п'ятниці», «впродовж 7 днів», «з 5 по 10 червня», «десь у травні», «після свят». The model itself is unreliable for this — it hallucinates, misinterprets relative dates per language, and computes ranges with fencepost errors.

The current best practice is to offload date interpretation to a deterministic tool. In the JS/TS ecosystem, [chrono-node](https://github.com/wanasit/chrono) is the leading library; it has a basic Ukrainian locale but lacks the patterns booking/scheduling assistants need (duration windows, fuzzy month references, compound-month ranges, weekend semantics with cultural conventions, holiday references).

After a survey of date-parsing approaches across ecosystems (Python `dateparser`, Ruby `Chronic`, Java `Natty`, Microsoft Recognizers-Text, Facebook Duckling, Go `when`), the best long-term path is a new TS-first library built on the Duckling-style compositional token+rule model, with a locale-as-data design (dateparser approach) and multi-candidate output (Recognizers-Text approach). Booking-domain patterns live in a separate plugin package (`@whenis/booking`) so the core stays domain-neutral.

## Goals

- Parse natural-language dates in Ukrainian and basic English; designed for adding Slavic languages (RU/PL/CS) later via the same locale-module pattern.
- First-class IR (intermediate representation) types covering absolute dates, relative dates, weekdays, ranges, windows, durations, and fuzzy references — not just point dates.
- Multi-candidate output ranked by confidence — callers with context can pick.
- Plugin/extension API: a third party can add new IR node types, rules, and resolvers without forking the core.
- Tree-shakeable monorepo; each locale is its own package, each plugin its own package.
- TypeScript-first, strict types, ESM + CJS dual.

## Non-goals (v0.1)

- Time-of-day parsing («о 15:30», «to 8 PM»). Plan to add in v0.2.
- Recurring events («every Friday», «monthly»). Possible v0.3.
- Time zones beyond a single anchor zone passed by caller.
- RU/PL/CS locales — extension-pattern proven on UA + EN first, then expand.
- Holiday calendar built into core — booking plugin accepts injectable holiday map.

## Repo layout

pnpm workspaces monorepo at `~/WebstormProjects/whenis` (initially):

```
whenis/
├── package.json                 # workspace root, scripts only
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   ├── design.md                # this doc
│   └── adr/                     # future architecture decisions
├── packages/
│   ├── core/                    # @whenis/core
│   │   ├── src/
│   │   │   ├── index.ts         # public API surface
│   │   │   ├── types.ts         # ResolvedDate, ParseResult, Match
│   │   │   ├── ir.ts            # IRNode discriminated union
│   │   │   ├── tags.ts          # Tag union for tokens
│   │   │   ├── tokenizer.ts     # text → Token[]
│   │   │   ├── rule-engine.ts   # iterative rule firing
│   │   │   ├── resolver.ts      # IR → ResolvedDate[]
│   │   │   ├── locale.ts        # Locale interface
│   │   │   └── plugin.ts        # Plugin interface
│   │   ├── test/
│   │   └── package.json
│   ├── locale-uk/               # @whenis/locale-uk
│   │   ├── src/
│   │   │   ├── lexicon.ts       # all inflected forms → Tag[]
│   │   │   ├── rules.ts         # UA-specific rules
│   │   │   └── index.ts
│   │   ├── test/corpus.jsonl    # golden parse corpus
│   │   └── package.json
│   ├── locale-en/               # @whenis/locale-en
│   └── booking/                 # @whenis/booking (plugin)
│       ├── src/
│       │   ├── rules.ts         # WindowParser, StayDurationParser, ...
│       │   ├── ir-extensions.ts # MostlyPastNode, ...
│       │   └── index.ts
│       └── package.json
└── apps/
    └── playground/              # @whenis/playground (web demo, post-v0.1)
```

Published day-1: `@whenis/core`, `@whenis/locale-uk`, `@whenis/locale-en`, `@whenis/booking`. The bare name `whenis` is reserved on npm but unused (or made a thin metapackage that re-exports core).

## Core architecture

A 4-layer pure-functional pipeline. Each layer is testable independently.

```
Input string
   │
   ▼
[1] Preprocessor       — locale.preprocess: middleware chain (normalize apostrophes,
   │                     collapse whitespace, transliterate, written-number rewrite)
   ▼
[2] Tokenizer + Tagger — split on whitespace/punctuation, each token gets typed Tag[]
   │                     via locale.lexicon lookup
   ▼
[3] Rule Engine        — iterate over rules; each matched rule replaces a span of
   │                     tokens with an IRNode; loop until fixpoint
   ▼
[4] Resolver           — for each IRNode, produce one or more ResolvedDate candidates
   │                     against (reference Date, locale options); rank
   ▼
ParseResult { matches: Match[] with candidates: ResolvedDate[] }
```

### Token tags (`Tag` union)

```ts
type Tag =
  | { kind: 'Numeral';     value: number }                      // 7, 25
  | { kind: 'Ordinal';     value: number }                      // 5го, fifth, першого
  | { kind: 'MonthName';   month: number }                      // 1..12, all inflected forms
  | { kind: 'WeekdayName'; weekday: number }                    // 1..7 (ISO; Mon=1)
  | { kind: 'TimeUnit';    unit: 'day'|'week'|'month'|'year'|'night' }
  | { kind: 'Pointer';     direction: 'past'|'future'|'this' }  // «минулого/наступного/цього»
  | { kind: 'Grabber';     modifier: 'next'|'last'|'nearest'|'in'|'ago'|'within'|'until' }
  | { kind: 'Connector';   conn: 'from'|'to'|'through'|'between'|'and' }
  | { kind: 'Literal';     text: string };
```

A single string token may carry MULTIPLE tags (ambiguity): e.g., «5» → `[Numeral(5)]`; «п'ятого» → `[Ordinal(5)]`; «травня» → `[MonthName(5)]`; «суботи» → `[WeekdayName(6)]` (Sat, genitive).

Locale lexicon maps `string → Tag[]`. Static enumeration; no runtime morphology. For Ukrainian: ~12 months × 7 case forms + ~7 weekdays × 4 case forms + numerals/ordinals + Pointer/Grabber/Connector vocabulary ≈ 250 entries. Maintainable.

### IR node types (`IRNode` union)

```ts
type IRNode =
  | { type: 'absolute'; year?: number; month?: number; day?: number; weekday?: number }
  | { type: 'relative'; offset: { weeks?: number; days?: number; months?: number; years?: number }; direction: 'past'|'future'|'this' }
  | { type: 'weekday';  weekday: number; modifier: 'this'|'next'|'last'|'nearest' }
  | { type: 'duration'; nights?: number; days?: number; weeks?: number }      // stay length
  | { type: 'window';   from: IRNode; to: IRNode }                            // search window
  | { type: 'range';    start: IRNode; end: IRNode; convention: 'checkout'|'inclusive' }
  | { type: 'fuzzy';    granularity: 'month'|'season'|'year'; ref: IRNode; reason: string }
  | { type: 'unresolved'; reason: string };
```

Why each is in core (not booking plugin):
- `range` with `convention` — every booking-like language has both «to/until» (exclusive end) and «through» (inclusive). Universal.
- `window` — appears in tons of NL queries («show me available slots in the next 7 days») beyond booking.
- `duration` — universal stay/period concept.
- `fuzzy` — universal handling of imprecise refs («sometime in May»).

Booking-specific concepts (mostly_past detection, suggest_next_month hints, weekend pair semantics) live in `@whenis/booking` as IR extensions + resolvers.

### Rule format

```ts
interface Rule {
  name: string;
  priority?: number;                                       // higher fires first; default 0
  // Pattern: array of matchers; each matches one Token (or a typed IRNode in scope)
  pattern: PatternItem[];
  produce: (matched: (Token | IRNode)[]) => IRNode | null;
}

type PatternItem =
  | { tag: Tag['kind']; predicate?: (t: Token) => boolean }
  | { node: IRNode['type'] };
```

Rules fire iteratively. After a rule matches and emits an `IRNode`, the engine replaces the matched span with that node, and rules can now match against IR nodes too (compositional). Loop until no rule fires.

Example rules (core, language-agnostic):
- `Numeral + TimeUnit` → `duration(unit=n)` (e.g., "7 days")
- `Grabber(in) + duration` → `relative(direction=future, offset=duration)` (e.g., "in 3 days")
- `Pointer(next) + WeekdayName` → `weekday(modifier=next)`

Locale-specific rules in `@whenis/locale-uk/rules.ts`:
- «наступн* X» variants
- Ukrainian genitive-month range («з 5 по 10 червня» — month attaches to both 5 and 10)
- Russian-influence misspellings normalization

Booking-plugin rules in `@whenis/booking/rules.ts`:
- "впродовж N днів" → `window`
- "на N ночей" → `duration(nights=N)`
- "<date> на N ночей" → `range(start=date, end=date+N, convention=checkout)` with `nights=N`

### Resolver

Takes `IRNode + referenceDate + LocaleOptions` → `ResolvedDate[]`.

- `weekday(modifier=next, Friday)` + `{preferFuture: true}` → next ISO week's Friday, confidence 1.0
- `weekday(modifier=this, Friday)` when this week's Friday is past → emit candidates: past Friday (conf 0.3), next Friday (conf 0.6) — let caller rank by context
- `range(start, end, checkout)` → resolve start + end, compute nights = end - start
- `range(start, end, inclusive)` → resolve start + end, checkout = end + 1, nights = end - start + 1
- `unresolved(reason)` → emit a single `{type:'fuzzy', reason}` candidate with confidence 0.0 so callers know nothing matched

Resolver also runs through any plugin-provided enrichers (e.g., booking plugin's `MostlyPastEnricher` that adds `metadata.suggest_next_month = true` to fuzzy month candidates when the month is ≥75% elapsed).

## Locale interface

```ts
interface Locale {
  code: string;                                    // 'uk', 'en'
  dateOrder: 'DMY' | 'MDY' | 'YMD';
  weekStart: 'mon' | 'sun';                        // ISO mon=1 vs locale-dependent
  preprocess: ((s: string) => string)[];           // composed in order
  lexicon: Map<string, Tag[]>;                     // tokenizer lookup
  rules: Rule[];                                   // locale-specific rules
  defaults: {
    preferFuture: boolean;
    fuzzyMonthThreshold?: number;                  // for booking-plugin enricher (default 0.75)
  };
}
```

A locale is pure data + array of rules. Adding a new locale = one source file (or directory of split files) + a corpus.jsonl of golden tests. No core code changes.

For prefix-stem matching (Slavic morphology): lexicon supports both exact strings (fast path) AND a `stems: Array<[RegExp, Tag[]]>` fallback for regex-based matches (used for morphological stems like `/^трав/` → MonthName(5)). UA locale uses both: exact entries for the most common forms (fast O(1) lookup) + stems for catch-all morphology. **Precedence: exact-match wins over stem-match** (more specific is better; also keeps the hot path O(1)).

## Plugin / Extension API

```ts
interface Plugin {
  name: string;
  tags?: Map<string, Tag[]>;          // additional lexicon (merged with locale lexicon)
  rules?: Rule[];                     // additional rules
  irExtensions?: IRTypeExt[];         // new IRNode kinds with type+resolver
  enrichers?: Enricher[];             // post-resolution enrichment (e.g., add metadata)
}

interface IRTypeExt {
  type: string;                       // e.g., 'mostly_past'
  resolve: (node: IRNode, ctx: ResolverCtx) => ResolvedDate[];
}

interface Enricher {
  // Called once per candidate after resolution. May mutate or replace.
  apply: (candidate: ResolvedDate, ctx: ResolverCtx) => ResolvedDate;
}
```

Worked example — `@whenis/booking` plugin:

```ts
import { Plugin } from '@whenis/core';

export const booking: Plugin = {
  name: '@whenis/booking',
  rules: [
    windowRule,           // "впродовж N днів" → window IR
    stayDurationRule,     // "на N ночей" → duration IR
    weekendPairRule,      // Sat+Sun semantics
    holidayRefRule,       // "після свят" → fuzzy(reason=holiday_ref)
  ],
  enrichers: [
    mostlyPastEnricher,   // adds suggest_next_month metadata
  ],
};
```

`hutshub-chatbot` integration replaces the current in-tree `DateResolverService` with:

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '@whenis/booking';

export class DateResolverService {
  private parser = createParser({
    locales: [uk],
    plugins: [booking],
    options: { preferFuture: true },
  });
  resolveDateExpression(expr: string, anchorIso: string): DateResolution {
    const result = this.parser.parse(expr, { reference: new Date(anchorIso) });
    return adaptToLegacyResolution(result); // thin shim
  }
}
```

This proves the plugin API and gives the library its first real-world user.

## Output shape

```ts
interface ParseResult {
  source: string;
  matches: Match[];
}

interface Match {
  text: string;                          // matched substring
  start: number;
  end: number;                           // char positions in source
  candidates: ResolvedDate[];            // ranked by confidence DESC, length >= 1
}

interface ResolvedDate {
  confidence: number;                    // 0..1
  type: 'date' | 'range' | 'window' | 'duration' | 'fuzzy';
  date?: string;                         // ISO YYYY-MM-DD when type==='date'
  start?: string;                        // ISO when type==='range' | 'window'
  end?: string;                          // ISO when type==='range' | 'window'
  nights?: number;                       // when type==='duration' | 'range'
  granularity?: 'day' | 'month' | 'year';
  reason?: string;                       // explainability tag ('next_iso_week', 'mostly_past', 'holiday_ref', 'unresolved')
  metadata?: Record<string, unknown>;    // plugin-specific hints (suggest_next_month, etc.)
}
```

Multi-candidate output is the default. The `confidence` field is the library's best guess based on the rule that produced the candidate (e.g., explicit ISO → 1.0; bare weekday → 0.6 because "this/next" is unclear; ambiguous → 0.3). Callers with extra context (conversation state, user history) can re-rank.

## Build, test, release

- **Build**: each package uses `tsup` for ESM + CJS dual output, `.d.ts` shipped.
- **TypeScript**: strict mode, target ES2022, `moduleResolution: "bundler"`.
- **Tests**: `vitest`. Each locale has `test/corpus.jsonl` (golden file: `{input, reference, expected: [...candidates]}` per line) plus unit tests for rules. Property-based tests (`fast-check`) for invariants: «`resolved >= referenceDate` for any `preferFuture=true` weekday rule», «`nights = end - start` for `range(checkout)`».
- **CI**: GitHub Actions, matrix Node 18/20/22, run `pnpm test` + `pnpm typecheck` + `pnpm build`.
- **Release**: `changesets` for versioning + changelog. Manual publish to npm.
- **Node target**: ≥18.0 (covers LTS).

## v0.1 scope checklist

- [ ] Monorepo skeleton: pnpm workspace, base tsconfig, shared lint
- [ ] `@whenis/core`: types, tokenizer, rule engine, resolver, locale + plugin interfaces, base rules (ISO, numeric DD.MM forms, generic Numeral+TimeUnit → duration)
- [ ] `@whenis/locale-uk`: full lexicon (months × 7 cases + weekdays × 4 cases + numerals/ordinals + pointer/grabber/connector vocab), UA-specific rules (наступн*, цю/цей, з/від A до/по B compound-month), corpus.jsonl with ~50 cases
- [ ] `@whenis/locale-en`: basic lexicon + rules (today/tomorrow/yesterday, next/this/last + weekday, M/D[/Y], M-D), corpus.jsonl ~30 cases
- [ ] `@whenis/booking`: WindowParser, StayDurationParser, WeekendPair, HolidayRef, MostlyPastEnricher
- [ ] README per package, root README with quickstart
- [ ] Integration smoke: replace `hutshub-chatbot`'s DateResolverService with `whenis` parser and pass all existing 84 resolver tests
- [ ] CI green
- [ ] First publish to npm (0.1.0)

## Out of scope (v0.1)

- Time-of-day, recurring patterns, time zones beyond anchor.
- RU/PL/CS locales (post-v0.1 via same extension pattern).
- Playground web app (`apps/playground` — added when there's a story to tell).
- Built-in holiday calendar (booking plugin takes optional injected map).
- Programmatic morphology engine — static enumeration handles UA/RU/PL/CS comfortably for the targeted vocab size.

## Risks / open issues

- **Rule ordering / shadowing**: with compositional iterative firing, a too-greedy rule can swallow tokens that a later more-specific rule needed. Mitigation: tie-breaking by rule priority (numeric, set per rule) + extensive corpus tests.
- **Lexicon collisions across locales**: when multiple locales are loaded simultaneously, the same string may map to different tags. Day-1 design: one parser instance = one locale. Multi-locale parsers postponed.
- **Confidence scoring is heuristic**: there's no ground truth for confidence values. Document this clearly; expose hooks for callers to override.
- **Breaking changes from upstream chrono won't affect us** (no dep) — but we lose chrono's existing user base. Mitigated by clear README positioning «for Slavic + booking domain» and an interop helper (`fromChronoResult()` shim if/when useful).

## Decisions log

- Name: `whenis` (single word, descriptive, available)
- Locales day-1: UA + EN
- Booking-domain features: separate plugin package
- Output: multi-candidate with confidence
- Repo: monorepo, pnpm workspaces
- License: MIT
- Module system: ESM + CJS dual
- Node target: ≥18

## Next steps

1. User approves design (this doc).
2. Implementation plan written via `writing-plans`.
3. Skeleton scaffolded, first tests green for one trivial rule end-to-end.
4. Build out core, then UA locale, then booking, then hutshub-chatbot integration smoke.
