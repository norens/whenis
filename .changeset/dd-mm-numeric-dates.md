---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

GAP-2: numeric dot-separated dates — `15.07`, `12.06.2025`, `12.06-22.06`.

**core: tokenizer guard.** Tokens matching `/^\d{1,2}\.\d{1,2}(?:\.\d{4}|-\d{1,2}\.\d{1,2})?$/` are now classified as `Literal`, not `Numeral`. Without this guard `15.07` would land as `Numeral{ value: 15.07 }` (float) and `12.06.2025` as `Numeral{ value: NaN }` — both useless.

**locale-uk: two new rules** at priority 100 (same as ISO):

- `ukDdMmDateRule` — `DD.MM` and `DD.MM.YYYY` → `absolute` IR (DMY order). Bare `DD.MM` rolls forward via the existing `preferFuture` path; explicit-year past dates pick up the `past_iso` reason from the absolute resolver.
- `ukDdMmRangeRule` — `DD.MM-DD.MM` → `range` (checkout convention).

Closes "GAP-2". Tokenizer change is locale-agnostic (just blocks the numeric fallback); the DMY interpretation lives in `locale-uk` so locales with other date orders (e.g. en-US MDY) can add their own rule when needed.
