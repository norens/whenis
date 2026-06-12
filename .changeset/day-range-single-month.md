---
"@whenis/core": minor
"@whenis/locale-uk": minor
"@whenis/locale-en": minor
"@whenis/booking": minor
---

**GAP-22 — day range with the month written once**

UA locale now parses day ranges where the month appears once after the second day:

- `22-25.06` / `22 - 25.06` → range Jun 22 → Jun 25 (checkout convention)
- `22-25 червня` / `22 - 25 червня` → same range
- en/em dashes accepted in the compact forms
- past ranges roll to the next year, same as `DD.MM`
- reversed pairs (`25-22.06`) are rejected as typos, not wrapped around

Spaced variants are handled by a compound rule that consumes the already-reduced
`absolute` node on the right-hand side, so they compose with both `DD.MM` and
`<day> <month>` spellings without tokenizer changes.
