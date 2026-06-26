# @whenis/locale-en

## 0.7.0

### Minor Changes

- [#19](https://github.com/norens/whenis/pull/19) [`fef23a2`](https://github.com/norens/whenis/commit/fef23a2ed38f12dab529047e3b80ee22ec0b6082) Thanks [@norens](https://github.com/norens)! - **Two fully-qualified dates range — month on both sides**

  UA locale now parses ranges where **both** endpoints carry their own month (name or `DD.MM`),
  joined by `по` / `до` / a bare dash, with or without a leading `з` / `від`:

  - `з 26 липня по 28 липня` / `26 липня по 28 липня` → Jul 26 → Jul 29 (inclusive, `по` = last night)
  - `з 26 липня до 28 липня` → Jul 26 → Jul 28 (checkout convention, `до`)
  - `26 липня - 28 липня` / `26 липня – 28 липня` → checkout convention (bare dash)
  - `30 липня по 2 серпня` → cross-month ranges resolve correctly
  - `з 26.07 по 28.07` → `DD.MM` on both sides
  - cross-year wrap (`28 грудня по 3 січня`) rolls the end into the next year via the resolver's
    per-endpoint future-year roll
  - same-month reversed pairs (`28 липня по 26 липня`) are rejected as typos

  Three compound rules consume the already-reduced `absolute` node on each side, so they compose with
  month-name and `DD.MM` spellings without tokenizer changes. Previously these phrases dropped the end
  date and resolved to a single check-in.

## 0.6.0

## 0.5.0

### Minor Changes

- [#15](https://github.com/norens/whenis/pull/15) [`0b5aff5`](https://github.com/norens/whenis/commit/0b5aff55cccb91e69c2ac2b7784a6241efd4493b) Thanks [@norens](https://github.com/norens)! - **GAP-22 — day range with the month written once**

  UA locale now parses day ranges where the month appears once after the second day:

  - `22-25.06` / `22 - 25.06` → range Jun 22 → Jun 25 (checkout convention)
  - `22-25 червня` / `22 - 25 червня` → same range
  - en/em dashes accepted in the compact forms
  - past ranges roll to the next year, same as `DD.MM`
  - reversed pairs (`25-22.06`) are rejected as typos, not wrapped around

  Spaced variants are handled by a compound rule that consumes the already-reduced
  `absolute` node on the right-hand side, so they compose with both `DD.MM` and
  `<day> <month>` spellings without tokenizer changes.

## 0.4.0

### Minor Changes

- [#13](https://github.com/norens/whenis/pull/13) [`0f3f195`](https://github.com/norens/whenis/commit/0f3f195127a847693c9afeff59b10b0a1ca211e6) Thanks [@norens](https://github.com/norens)! - **v0.3 — multi-locale, vague markers, and the remaining v0.2 gaps**

  - `createParser({ locales: [uk, en], ... })` now uses every locale instead of silently ignoring all but the first. Ordered fallback chain (i18n-style) on lexicon collisions; each `Token` carries `sourceLocale` for debug and enricher policy. (GAP-13)
  - Vague qualifiers (`приблизно`, `десь`, `можливо`, `колись`) are first-class: vague-month patterns (`десь у травні`) emit a fuzzy IR; trailing/leading markers on a confident date downgrade it to a multi-candidate fuzzy/literal pair. (GAP-19, GAP-20)
  - `mostlyPastEnricher` now correctly checks the candidate's referenced month against the current month before attaching `suggest_next_month` — previously it fired on any fuzzy-month candidate when the current calendar month was ≥75% elapsed.
  - EN: `this`/`next`/`last weekend` rules. (GAP-14)
  - UA: `на вихідні` (GAP-15), `найближч*` as `Grabber:nearest` wired to weekday and weekend rules (GAP-16), optional `в`/`у` filler in `останні вихідні` (GAP-17), ordinal day-of-month (`першого травня`, `двадцять першого травня`) (GAP-18), DD.MM range with whitespace around dash (`12.06 - 22.06`) (GAP-21), `U+2019` right-single-quote in apostrophe normalization (GAP-12).
  - New: `packages/booking/test/integration-corpus.test.ts` — 74-case integration smoke harness covering every IR shape end-to-end through the UA + EN + booking stack. Mirrored as `scripts/smoke-corpus.mjs` for standalone runs.

  **Breaking (minor under 0.x):** `ResolvedDate.reason: 'past_iso'` renamed to `'past_date'`. The reason vocabulary is now documented in `CONTRIBUTING.md`. Adapter consumers should update their reason-mapping tables.

## 0.3.0

### Minor Changes

- [#8](https://github.com/norens/whenis/pull/8) [`75d17a5`](https://github.com/norens/whenis/commit/75d17a56fdf84461a84657d7fffda72783e0f3c9) Thanks [@norens](https://github.com/norens)! - GAP-1 + GAP-9: past-ISO signal and `до кінця тижня/місяця`.

  **core: `reason: 'past_iso'` signal.** When `isoDateRule` resolves to a date strictly before the reference, the resolver attaches `reason: 'past_iso'` to the candidate (confidence stays at `1` — ISO is unambiguous, the signal is for callers that want to roll forward or flag the input). Closes "GAP-1".

  **core: new `boundary` IR node.** `{ type: 'boundary'; unit: 'week' | 'month' | 'year'; edge: 'start' | 'end' }` resolves to the start/end of the relevant ISO period against the reference (via Luxon `startOf`/`endOf`). Lets rules express "end of week/month" without needing concrete day offsets at rule time.

  **locale-uk: `до кінця тижня / до кінця місяця`.** New `ukUntilEndOfRule` (priority 78) matches `Connector:to + Literal:__end_of__ + TimeUnit` and emits a `window` from today to `boundary(unit, 'end')`. Adds `кінця` / `кінець` to the lexicon as the end-of marker, plus missing `тижня` / `тижнем` (genitive/instrumental singular of `тиждень`). Closes "GAP-9" for week and month — year is still gated on `року` being in the skip set; deferring.

- [#10](https://github.com/norens/whenis/pull/10) [`aeac351`](https://github.com/norens/whenis/commit/aeac351ac2602fba5ee6f1a763ba614f61efc975) Thanks [@norens](https://github.com/norens)! - GAP-10: combined `<date> на N ночей` intent.

  **core: new `offset_from` IR node.** `{ type: 'offset_from'; base: IRNode; days: number }` resolves `base` then adds `days`. Lets one IR be expressed as a fixed-day offset from another.

  **booking: `bookingDateWithNightsRule`** (priority 80). Pattern `Connector:from? + node:absolute + node:duration` — fires after `ukDayMonthRule` (60) and `stayDurationRule` (75) have produced their sub-IRs. Glues them into a single `range` with `start = absolute`, `end = offset_from(start, duration.nights)`, `convention: 'checkout'`. Closes "GAP-10" — `5 червня на 2 ночі` and `з 5 червня на 3 ночі` now resolve as ranges with correct nights.

- [#12](https://github.com/norens/whenis/pull/12) [`eb8f05e`](https://github.com/norens/whenis/commit/eb8f05e1a54127b90cd588cdeacd96a8645220e2) Thanks [@norens](https://github.com/norens)! - GAP-2: numeric dot-separated dates — `15.07`, `12.06.2025`, `12.06-22.06`.

  **core: tokenizer guard.** Tokens matching `/^\d{1,2}\.\d{1,2}(?:\.\d{4}|-\d{1,2}\.\d{1,2})?$/` are now classified as `Literal`, not `Numeral`. Without this guard `15.07` would land as `Numeral{ value: 15.07 }` (float) and `12.06.2025` as `Numeral{ value: NaN }` — both useless.

  **locale-uk: two new rules** at priority 100 (same as ISO):

  - `ukDdMmDateRule` — `DD.MM` and `DD.MM.YYYY` → `absolute` IR (DMY order). Bare `DD.MM` rolls forward via the existing `preferFuture` path; explicit-year past dates pick up the `past_iso` reason from the absolute resolver.
  - `ukDdMmRangeRule` — `DD.MM-DD.MM` → `range` (checkout convention).

  Closes "GAP-2". Tokenizer change is locale-agnostic (just blocks the numeric fallback); the DMY interpretation lives in `locale-uk` so locales with other date orders (e.g. en-US MDY) can add their own rule when needed.

- [#11](https://github.com/norens/whenis/pull/11) [`b2e68f9`](https://github.com/norens/whenis/commit/b2e68f95005b2ac9ef9e11eec5748c1f59841541) Thanks [@norens](https://github.com/norens)! - GAP-11: `останні вихідні [місяця]`.

  **core: new `last_weekday_in_month` IR node.** `{ type: 'last_weekday_in_month'; weekday: number; month?: number }` resolves to the last given ISO weekday of the named (or reference) month, current year.

  **locale-uk:** `останній / остання / останні / останніх / останнього / останньої` as `Grabber:last`.

  **booking:** `weekendLastOfMonthRule` (priority 82). Pattern `Grabber:last + Literal:вихідн* + MonthName?` — emits a `range` of Sat-Sun of the named (or current) month's last weekend. Uses the new `last_weekday_in_month` to find the last Saturday and `offset_from` to derive Sunday. Closes "GAP-11".

## 0.2.0

### Minor Changes

- [#6](https://github.com/norens/whenis/pull/6) [`f8b162c`](https://github.com/norens/whenis/commit/f8b162cd7ff9a03fdea94c7c59e15f66aa5adead) Thanks [@norens](https://github.com/norens)! - Optional pattern items in the rule engine + three v0.2 backlog fixes.

  **Core: `PatternItem.optional?: boolean`.** The rule engine now enumerates subsets of optional pattern items, preferring longer (more-specific) matches first. `produce()` receives `Array<Token | IRNode | null>` where indices of skipped optionals are `null`. Rules without optionals are unaffected — they never observe `null`. Inspired by Chronic's `?`-suffixed pattern elements; eliminates rule duplication for filler-word variants.

  **locale-uk: `ці` / `цих` / `цими`** as `Pointer:this`. Closes "GAP-4" — `ці вихідні` now resolves to the current ISO week's Sat–Sun.

  **locale-uk: bare `через тиждень` / `через місяць`.** `ukThroughNRule`'s `Numeral` slot is now optional with a default value of `1`. Closes "GAP-6" without rule duplication.

  **locale-uk: `наступних` / `наступним` / `наступними`** as `Grabber:next` (genitive plural and instrumental forms that were missing).

  **booking: `впродовж наступних N днів`.** `windowWithinNRule` (and the «у/в»-prefixed variant) now accept an optional `Grabber:next` filler between `within` and `Numeral`. Closes "GAP-8".

- [#3](https://github.com/norens/whenis/pull/3) [`90fe0d7`](https://github.com/norens/whenis/commit/90fe0d77d5b404183ef3831d9fccef8dc305a268) Thanks [@norens](https://github.com/norens)! - Add `Locale.skip?: Set<string>` for dropping date-context filler tokens (e.g. Ukrainian «р.» / «року») before classification. Tokenizer filters skipped tokens after the length-preserving preprocess pass; positions of surviving tokens still reference the original input.

  UA locale now recognises:

  - Word-numerals one through fifteen, plus twenty and thirty (`два`, `сім`, `п'ятнадцять`, `тридцять`, ...). Closes "GAP-5" — `«через два тижні»` and `«через сім днів»` now resolve via the existing `ukThroughNRule`.
  - `позавтра` as a colloquial synonym of `післязавтра` (+2 days). Closes "GAP-3".
  - `р.`, `року`, `рік` as skip-set filler. `«25 травня 2026 р.»` and `«25 травня 2026 року»` now resolve to the absolute date.

## 0.1.1

### Patch Changes

- [`ef8cd9a`](https://github.com/norens/whenis/commit/ef8cd9a437e7599af839b598d0f29ff685ad6776) Thanks [@norens](https://github.com/norens)! - Use static MIT license badge in READMEs. The shields.io `npm/l/...`
  endpoint shows "package not found" for the first few hours after a
  scoped package is published, since shields can't immediately crawl
  license metadata. Static badges are always correct and don't depend on
  crawler timing. Also drop the `color=cb3837` override on the npm
  version badge — it read as an alarm next to the broken license one.
- Updated dependencies [[`ef8cd9a`](https://github.com/norens/whenis/commit/ef8cd9a437e7599af839b598d0f29ff685ad6776)]:
  - @whenis/core@0.1.1
