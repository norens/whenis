---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

Add `Locale.skip?: Set<string>` for dropping date-context filler tokens (e.g. Ukrainian «р.» / «року») before classification. Tokenizer filters skipped tokens after the length-preserving preprocess pass; positions of surviving tokens still reference the original input.

UA locale now recognises:

- Word-numerals one through fifteen, plus twenty and thirty (`два`, `сім`, `п'ятнадцять`, `тридцять`, ...). Closes "GAP-5" — `«через два тижні»` and `«через сім днів»` now resolve via the existing `ukThroughNRule`.
- `позавтра` as a colloquial synonym of `післязавтра` (+2 days). Closes "GAP-3".
- `р.`, `року`, `рік` as skip-set filler. `«25 травня 2026 р.»` and `«25 травня 2026 року»` now resolve to the absolute date.
