# @whenis/booking

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
