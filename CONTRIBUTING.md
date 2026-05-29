# Contributing to whenis

Thanks for your interest. This repo is a pnpm-workspaces monorepo with four
published packages under `@whenis/*`.

## Prerequisites

- Node ≥ 18 (CI matrix: 18 / 20 / 22)
- pnpm ≥ 9 — `corepack enable && corepack prepare pnpm@9 --activate`

## Local setup

```bash
pnpm install
pnpm -r build
pnpm test
```

The test suite includes golden corpora at `packages/locale-*/test/corpus.test.ts`
— each line is a `{ input, reference, expected }` triple parsed end-to-end.

## Adding a rule

1. Find the closest existing rule in the relevant locale (e.g.
   `packages/locale-uk/src/rules.ts`).
2. Add the pattern + `produce` function. Patterns match tokens (by `Tag.kind`)
   or previously emitted IR nodes (by `IRNode.type`).
3. Add a corpus entry for every shape you intend to support — including the
   ones that should NOT match (negative cases).
4. Run `pnpm test --filter @whenis/locale-uk`.

## Adding a locale

A locale is pure data plus an array of rules. See
[`packages/locale-en/src/index.ts`](./packages/locale-en/src/index.ts) for the
minimum surface.

```ts
import type { Locale } from '@whenis/core';

export const xx: Locale = {
  code: 'xx',
  dateOrder: 'DMY',
  weekStart: 'mon',
  preprocess: [s => s.toLowerCase()],
  lexicon: new Map([ /* string → Tag[] */ ]),
  stems: [ /* [RegExp, Tag[]] */ ],
  rules: [ /* Rule[] */ ],
  defaults: { preferFuture: true },
};
```

No core changes required. Open a separate package under `packages/locale-xx/`
following the existing pattern.

## Versioning and releases

We use [changesets](https://github.com/changesets/changesets). The four
`@whenis/*` packages are **fixed-versioned** — they bump together so users
never see a `@whenis/locale-uk@0.3` that requires a `@whenis/core@0.2` you
haven't installed.

For every user-visible change:

```bash
pnpm changeset
```

Pick the affected packages, the bump type (`patch` / `minor` / `major`) and
write a short summary that will land in `CHANGELOG.md`. Commit the file under
`.changeset/`.

When PRs with changesets merge to `main`, the release workflow opens a
"Version Packages" PR. Merging that PR publishes to npm via OIDC trusted
publishing — no `NPM_TOKEN` involved.

## Design notes

### Reason vocabulary on ResolvedDate

The `ResolvedDate.reason` string communicates *why* the parser produced a
particular candidate. Stable names:

- `past_date` — an absolute date in the past (ISO or DD.MM.YYYY with explicit
  year). The resolver still emits the date with `confidence: 1`; the reason
  signals to callers that they may want to refuse rather than schedule. v0.3
  renamed this from `past_iso` because the same string now covers DD.MM.YYYY
  fixed-year past dates too.
- `vague_month` — a month-granularity fuzzy match (e.g. `десь у травні`),
  emitted by locale rules over a `VagueMarker + Connector:in + MonthName`
  pattern. `granularity: 'month'`, `confidence: 0.3`; the `mostlyPastEnricher`
  may attach `metadata.suggest_next_month` when the named month is the
  current month and ≥75% elapsed.
- `vague_qualified` — a confident inner read (date/weekday/range) wrapped by
  a vague marker (`приблизно`, `можливо`). Emitted as TWO candidates: the
  inner reading at lower confidence (0.4) + a fuzzy candidate at 0. Callers
  who want "refuse on vagueness" filter `confidence < 0.5`; callers who want
  the literal reading take the top candidate.
- `this_week_past_fallback_next` — `цю п'ятницю` from a day when this week's
  Friday has already passed. The resolver falls forward to next week's same
  weekday with `confidence: 0.6`. NOT the same as `past_date`; it is a
  helpful-fallback signal.
- `holiday_ref` — emitted only by application adapters (whenis does not ship
  a holiday calendar).

## Style

- Strict TypeScript everywhere; no `any`.
- Pure functions per layer (tokenizer, rule engine, resolver). No globals.
- Tests use `vitest`. Corpus tests for parser behaviour; unit tests for rule
  internals when complex.

## License

By contributing you agree your work ships under the project [MIT](./LICENSE).
