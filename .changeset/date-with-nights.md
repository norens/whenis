---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

GAP-10: combined `<date> на N ночей` intent.

**core: new `offset_from` IR node.** `{ type: 'offset_from'; base: IRNode; days: number }` resolves `base` then adds `days`. Lets one IR be expressed as a fixed-day offset from another.

**booking: `bookingDateWithNightsRule`** (priority 80). Pattern `Connector:from? + node:absolute + node:duration` — fires after `ukDayMonthRule` (60) and `stayDurationRule` (75) have produced their sub-IRs. Glues them into a single `range` with `start = absolute`, `end = offset_from(start, duration.nights)`, `convention: 'checkout'`. Closes "GAP-10" — `5 червня на 2 ночі` and `з 5 червня на 3 ночі` now resolve as ranges with correct nights.
