# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

pnpm is the only supported package manager (`packageManager: pnpm@9.0.0`, `engines.pnpm >=9`). Don't use npm/yarn.

```bash
pnpm install                       # bootstrap workspace
pnpm -r build                      # build all packages (tsup → dist/ ESM + CJS + .d.ts)
pnpm test                          # vitest run, all packages via vitest.workspace.ts
pnpm test:watch                    # watch mode
pnpm -r typecheck                  # tsc --noEmit per package
pnpm lint                          # eslint packages

# Single package
pnpm --filter @whenis/locale-uk test
pnpm --filter @whenis/core build

# Single test file / pattern
pnpm test packages/locale-uk/test/corpus.test.ts
pnpm test -t "next Friday"
```

Note: CI runs `pnpm -r build` **before** `pnpm -r typecheck` because locale/booking packages depend on `@whenis/core`'s built `.d.ts`. Running typecheck on a clean checkout without building first will fail with missing types.

## Architecture

A 4-layer pure-functional pipeline implemented in `@whenis/core`. Each layer is independently testable; understanding the data flow between them is the key to navigating the repo.

```
input string
  → locale.preprocess (middleware chain: lowercase, normalize apostrophes, …)
  → tokenize + tag       (lexicon exact-match, then regex stems)
  → rule engine          (iterative fixpoint; rules match tokens OR emitted IR)
  → resolver             (IR → ResolvedDate[]; plugin enrichers run last)
  → ParseResult { matches: [{ candidates: ResolvedDate[] sorted by confidence DESC }] }
```

Source files in `packages/core/src/`:
- `tokenizer.ts` — text → `Token[]` via `Locale.lexicon` + `Locale.stems`
- `tags.ts` — `Tag` union (Numeral, Ordinal, MonthName, WeekdayName, TimeUnit, Pointer, Grabber, Connector, Literal). One token can carry multiple Tags (ambiguity).
- `ir.ts` — `IRNode` discriminated union: `absolute | relative | weekday | duration | window | range | fuzzy | unresolved`.
- `rule-engine.ts` — see "Rule engine" below.
- `base-rules.ts` — language-agnostic rules (ISO date passthrough, Numeral+TimeUnit → duration).
- `resolver.ts` — IR → `ResolvedDate[]`. Uses Luxon for date arithmetic and ISO week handling.
- `locale.ts`, `plugin.ts` — interfaces for extension points.
- `index.ts` — `createParser({ locales, plugins, options })` is the public surface.

### Rule engine semantics (non-obvious)

`rule-engine.ts` iterates until fixpoint with these properties — preserve them when modifying:

1. **Rules sorted by `priority` DESC once** at start (default 0). Higher priority fires first.
2. **After any rule fires, the engine restarts from the top-priority rule** (the `break outer` in the loop). This means a low-priority rule's emission can re-trigger a higher-priority rule on the new IR node — that's the compositionality.
3. **Patterns match Tokens OR previously emitted IRNodes**: `{ kind: 'tag', tag: 'Numeral' }` matches a Token with a Numeral tag; `{ kind: 'node', node: 'duration' }` matches a previously produced duration IR.
4. **Safety counter at 1000 iterations** throws "infinite loop". If you add a rule that can match its own output, give it lower priority than the consumer rule or it will spin.
5. **Exact lexicon match wins over regex stem match** (`tokenizer.ts`). This is deliberate — the hot path stays O(1) and specific entries override morphological fallback.

### IR conventions worth knowing

- `range.convention: 'checkout' | 'inclusive'`. `checkout` = end-exclusive (booking convention: «з 5 по 10» means check out on the 10th, nights = 5). `inclusive` = end inclusive (nights = end - start + 1). The resolver picks `nights` and adjusts `end` accordingly — read `resolveRange` before changing either.
- `weekday` with bare modifier (`'this'`) mid-week deliberately emits TWO candidates — this Friday (conf 0.6) and next Friday (conf 0.3). The library is multi-candidate by design; don't collapse this to a single answer.
- `unresolved` produces `confidence: 0` `fuzzy` candidate. Callers should treat conf=0 as "we tried, nothing matched".

## Packages

| Package | Role |
| ------- | ---- |
| `@whenis/core` | Engine. Depends on `luxon` only. |
| `@whenis/locale-uk` | Ukrainian locale (full inflected lexicon + UA-specific rules). `peerDependency: @whenis/core`. |
| `@whenis/locale-en` | English basics. Same shape as locale-uk. |
| `@whenis/booking` | Plugin: windows, stay durations, weekend pair semantics, holiday refs, `mostlyPastEnricher`. |

The 4 packages are **fixed-versioned via changesets** (`.changeset/config.json` → `"fixed": [[...]]`) — they bump together. Never publish them out of sync. A `@whenis/locale-uk@0.3` requiring `@whenis/core@0.2` is a release bug, not a feature.

`@whenis/core` is declared as a `peerDependency` of every locale and plugin — install it explicitly in apps so the consumer controls the version.

## Adding a rule, locale, or plugin

**New rule in an existing locale** (`packages/locale-uk/src/rules.ts`):
1. Find the closest existing rule, copy its shape.
2. Pattern matches Tokens (by `Tag.kind`) or IRNodes (by `IRNode.type`).
3. Add a corpus entry to `packages/locale-uk/test/corpus.jsonl` — one JSON per line: `{ "input": "...", "reference": "2026-05-28", "expected_date": "..."}` (or `expected_range`, `expected_window`, `expected_duration`, `expected_reason`).
4. Negative cases (shapes that should NOT match) belong in corpus too.

**New locale**: copy `packages/locale-en/` as a starting skeleton. A locale is pure data — no core changes required. See `CONTRIBUTING.md` for the minimum surface. The new package needs its own `vitest.config.ts` and `tsup.config.ts` (pattern is identical across packages).

**New plugin**: extend lexicon (`tags`), add `rules`, add `enrichers` (post-resolution candidate mutation), or add `irExtensions` (new IR node kinds). See `packages/booking/src/index.ts`.

## Testing conventions

- **Golden corpus** at `packages/locale-*/test/corpus.jsonl` — one parse per line, run end-to-end through `createParser({ locales: [locale], plugins: [booking] })`. This is the primary regression net for parser behavior.
- **Unit tests** (`*.test.ts`) cover individual layers (tokenizer, rule-engine, resolver) and specific complex rules.
- **vitest.workspace.ts** at root pulls in every `packages/*/vitest.config.ts` — so `pnpm test` from root runs everything.

## Releases

`changesets` + GitHub Actions + npm OIDC trusted publishing (no `NPM_TOKEN` secret). Flow:

1. Land a PR with `pnpm changeset` output committed under `.changeset/`.
2. The Release workflow opens / updates a "Version Packages" PR that bumps versions and writes CHANGELOG entries (changelog format: `@changesets/changelog-github`, repo `norens/whenis`).
3. Merging the Version PR publishes to npm with provenance.

`RELEASE_PAT` (a PAT, not `GITHUB_TOKEN`) is required so the workflow's PRs can trigger downstream CI. Don't change the release workflow to use `GITHUB_TOKEN` — the version PR's CI run won't fire.

**Changesets peerDep gotcha.** Internal peerDep ranges between packages span the 0.x cycle (e.g. `>=0.1.1 <1.0.0`, not `^0.1.1`). With `@changesets/cli` defaults, any non-patch change to a package with peer dependents promotes the dependents to MAJOR — and combined with `fixed`, that drags the whole monorepo to 1.0.0 on the first minor release. The repo opts in to `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange: true` so changesets only major-bumps when the new version actually leaves the peer range.

## Strict-TS conventions

- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `moduleResolution: bundler`, target ES2022. No `any` in source.
- Each package extends the base with `outDir: dist`, `rootDir: src`.
- Pure functions per layer. No module-level mutable state, no globals.

## Out of scope (v0.1)

Don't add these to core without a design discussion: time-of-day («о 15:30»), recurring events («every Friday»), time zones beyond the caller-passed anchor, built-in holiday calendars, or runtime morphology engines. Slavic morphology is handled by static enumeration + regex stems, not a programmatic engine.
