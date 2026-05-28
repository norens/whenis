---
"@whenis/core": minor
"@whenis/locale-uk": minor
"@whenis/locale-en": minor
"@whenis/booking": minor
---

Initial public release.

- `@whenis/core` — token + rule + resolver pipeline, multi-candidate output,
  plugin and locale interfaces, base rules (ISO date, `Numeral + TimeUnit` →
  duration).
- `@whenis/locale-uk` — full inflected Ukrainian lexicon (months × 7 cases,
  weekdays × 4 cases, pointers, connectors, time units, immediate keywords),
  rules for `наступн* X`, `день + місяць`, compound-month ranges, `через N`.
- `@whenis/locale-en` — basic English locale (today/tomorrow/yesterday,
  `next/this/last` weekday, durations).
- `@whenis/booking` — booking-domain plugin: stay duration, search windows,
  weekend semantics, holiday refs, mostly-past month enricher.
