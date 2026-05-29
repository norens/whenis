---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

GAP-11: `останні вихідні [місяця]`.

**core: new `last_weekday_in_month` IR node.** `{ type: 'last_weekday_in_month'; weekday: number; month?: number }` resolves to the last given ISO weekday of the named (or reference) month, current year.

**locale-uk:** `останній / остання / останні / останніх / останнього / останньої` as `Grabber:last`.

**booking:** `weekendLastOfMonthRule` (priority 82). Pattern `Grabber:last + Literal:вихідн* + MonthName?` — emits a `range` of Sat-Sun of the named (or current) month's last weekend. Uses the new `last_weekday_in_month` to find the last Saturday and `offset_from` to derive Sunday. Closes "GAP-11".
