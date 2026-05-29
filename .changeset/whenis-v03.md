---
"@whenis/core": minor
"@whenis/locale-uk": minor
"@whenis/locale-en": minor
"@whenis/booking": minor
---

**v0.3 — multi-locale, vague markers, and the remaining v0.2 gaps**

- `createParser({ locales: [uk, en], ... })` now uses every locale instead of silently ignoring all but the first. Ordered fallback chain (i18n-style) on lexicon collisions; each `Token` carries `sourceLocale` for debug and enricher policy. (GAP-13)
- Vague qualifiers (`приблизно`, `десь`, `можливо`, `колись`) are first-class: vague-month patterns (`десь у травні`) emit a fuzzy IR; trailing/leading markers on a confident date downgrade it to a multi-candidate fuzzy/literal pair. (GAP-19, GAP-20)
- `mostlyPastEnricher` now correctly checks the candidate's referenced month against the current month before attaching `suggest_next_month` — previously it fired on any fuzzy-month candidate when the current calendar month was ≥75% elapsed.
- EN: `this`/`next`/`last weekend` rules. (GAP-14)
- UA: `на вихідні` (GAP-15), `найближч*` as `Grabber:nearest` wired to weekday and weekend rules (GAP-16), optional `в`/`у` filler in `останні вихідні` (GAP-17), ordinal day-of-month (`першого травня`, `двадцять першого травня`) (GAP-18), DD.MM range with whitespace around dash (`12.06 - 22.06`) (GAP-21), `U+2019` right-single-quote in apostrophe normalization (GAP-12).
- New: `packages/booking/test/hutshub-smoke.test.ts` runs the 74-case input universe from `hutshub-chatbot/DateResolverService.test.ts` and confirms 74/74 PASS.

**Breaking (minor under 0.x):** `ResolvedDate.reason: 'past_iso'` renamed to `'past_date'`. The reason vocabulary is now documented in `CONTRIBUTING.md`. Adapter consumers should update their reason-mapping tables.
