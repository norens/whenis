<div align="center">

# whenis

**Natural-language date parsing for TypeScript — Ukrainian-first, plugin-extensible.**

[![CI](https://github.com/norens/whenis/actions/workflows/ci.yml/badge.svg)](https://github.com/norens/whenis/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@whenis/core?label=%40whenis%2Fcore)](https://www.npmjs.com/package/@whenis/core)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![types](https://img.shields.io/npm/types/@whenis/core)](https://www.typescriptlang.org/)
[![node](https://img.shields.io/node/v/@whenis/core)](https://nodejs.org/)

</div>

---

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk], options: { preferFuture: true } });

parser.parse("наступної п'ятниці", { reference: new Date('2026-05-28') });
// → { type: 'date', date: '2026-06-05', confidence: 1 }
```

## Why whenis

LLM-based assistants need to interpret messy natural-language dates: «наступної
п'ятниці», «впродовж 7 днів», «з 5 по 10 червня», «після свят». The model
itself is unreliable for this — it hallucinates, fencepost-errors ranges, and
gets weekday semantics wrong per locale.

[chrono-node](https://github.com/wanasit/chrono) is the popular JS option but
ships a thin Ukrainian locale and lacks the patterns that booking / scheduling
assistants need (duration windows, fuzzy month references, compound-month
ranges, weekend semantics, holiday references).

**`whenis`** is a TypeScript-first parser built around three ideas:

- **Token + rule pipeline**, à la Facebook Duckling — compositional, debuggable.
- **Locale as data** — adding RU/PL/CS is one source file, no engine changes.
- **Multi-candidate output** ranked by confidence — callers with conversation
  context can re-rank.

## Features

- Ukrainian + English out of the box; designed for adding Slavic locales.
- IR covers absolute dates, relatives, weekdays, ranges, windows, durations,
  and fuzzy references — not just point dates.
- **Plugin API**: third parties add IR nodes, rules, and enrichers without
  forking core.
- Strict TypeScript, ESM + CJS dual builds, `.d.ts` shipped.
- Tree-shakeable, zero implicit globals, no runtime morphology engine.
- Node ≥18, no DOM dependencies.

## Install

```bash
# core engine — required
pnpm add @whenis/core

# pick the locales you need
pnpm add @whenis/locale-uk
pnpm add @whenis/locale-en

# optional booking-domain plugin
pnpm add @whenis/booking
```

> `@whenis/core` is declared as a `peerDependency` of every locale and plugin
> — install it explicitly so you control the version in one place.

## Quick start

### Ukrainian

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk], options: { preferFuture: true } });
const ref = new Date('2026-05-28');

parser.parse('через 3 дні', { reference: ref }).matches[0].candidates[0];
// → { type: 'date', date: '2026-05-31', confidence: 1 }

parser.parse('з 5 по 10 червня', { reference: ref }).matches[0].candidates[0];
// → { type: 'range', start: '2026-06-05', end: '2026-06-11', nights: 6, confidence: 1 }
```

### English

```ts
import { createParser } from '@whenis/core';
import { en } from '@whenis/locale-en';

const parser = createParser({ locales: [en], options: { preferFuture: true } });

parser.parse('next Friday', { reference: new Date('2026-05-28') });
// → matches[0].candidates[0]: { type: 'date', date: '2026-06-05', confidence: 1 }
```

### Booking plugin

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '@whenis/booking';

const parser = createParser({
  locales: [uk],
  plugins: [booking],
  options: { preferFuture: true },
});
const ref = new Date('2026-05-28');

parser.parse('на 3 ночі',        { reference: ref }).matches[0].candidates[0];
// → { type: 'duration', nights: 3, confidence: 1 }

parser.parse('впродовж 7 днів',  { reference: ref }).matches[0].candidates[0];
// → { type: 'window', start: '2026-05-28', end: '2026-06-03', confidence: 1 }

parser.parse('після свят',       { reference: ref }).matches[0].candidates[0];
// → { type: 'fuzzy', reason: 'holiday_ref', confidence: 0.3,
//     metadata: { suggest_next_month: true } }
```

## Output shape

```ts
interface ParseResult {
  source: string;
  matches: Match[];
}

interface Match {
  text: string;             // the matched substring
  start: number;
  end: number;
  candidates: ResolvedDate[]; // ranked by confidence DESC, length >= 1
}

interface ResolvedDate {
  confidence: number;       // 0..1
  type: 'date' | 'range' | 'window' | 'duration' | 'fuzzy';
  date?: string;            // ISO YYYY-MM-DD
  start?: string;           // ISO when type ∈ {range, window}
  end?: string;             // ISO when type ∈ {range, window}
  nights?: number;          // when type ∈ {duration, range}
  granularity?: 'day' | 'month' | 'year';
  reason?: string;          // 'next_iso_week' | 'mostly_past' | 'holiday_ref' | ...
  metadata?: Record<string, unknown>;
}
```

Multi-candidate output is the default — bare `«п'ятниця»` mid-week emits both
*this Friday* (0.6) and *next Friday* (0.3), letting the caller pick based on
conversation context.

## Architecture

A 4-layer pure-functional pipeline. Each layer is independently testable.

```
       ┌──────────────────────────────────────────────────────────────┐
input  │  preprocess  →  tokenize+tag  →  rule engine  →  resolver    │  ParseResult
       └──────────────────────────────────────────────────────────────┘
              ↑               ↑               ↑              ↑
        locale.preprocess  locale.lexicon  base+locale+   resolver +
        chain              + stems         plugin rules   plugin enrichers
```

- **Preprocessor** — middleware chain per locale (apostrophe normalisation,
  lowercase, written-number rewrite).
- **Tokenizer + tagger** — exact-match dictionary on the hot path, regex
  stems as fallback for Slavic morphology. Exact-match wins.
- **Rule engine** — iterative compositional firing; rules can match on tokens
  *or* on previously emitted IR nodes, looping until fixpoint.
- **Resolver** — turns each IR node into one or more `ResolvedDate`
  candidates against a reference date + locale options.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@whenis/core`](./packages/core)             | Engine: tokenizer, rule engine, resolver, base rules. |
| [`@whenis/locale-uk`](./packages/locale-uk)   | Ukrainian locale — full inflected lexicon + rules. |
| [`@whenis/locale-en`](./packages/locale-en)   | English locale — basics. |
| [`@whenis/booking`](./packages/booking)       | Plugin: windows, stay duration, weekends, holiday refs, mostly-past enricher. |

## Status

`v0.1` ships UA + EN locales and the booking plugin. v0.2 work tracked in
internal notes covers: ISO passthrough rule, DD.MM numeric forms, Ukrainian
word-numerals, `до кінця тижня/місяця` window, and a few other gaps surfaced
by a real-world integration. Contributions welcome.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). TL;DR:

```bash
pnpm install
pnpm test
pnpm changeset       # describe your change for the next release
```

## License

[MIT](./LICENSE) © Nazar Fedyshyn
