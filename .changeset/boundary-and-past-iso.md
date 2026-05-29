---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

GAP-1 + GAP-9: past-ISO signal and `до кінця тижня/місяця`.

**core: `reason: 'past_iso'` signal.** When `isoDateRule` resolves to a date strictly before the reference, the resolver attaches `reason: 'past_iso'` to the candidate (confidence stays at `1` — ISO is unambiguous, the signal is for callers that want to roll forward or flag the input). Closes "GAP-1".

**core: new `boundary` IR node.** `{ type: 'boundary'; unit: 'week' | 'month' | 'year'; edge: 'start' | 'end' }` resolves to the start/end of the relevant ISO period against the reference (via Luxon `startOf`/`endOf`). Lets rules express "end of week/month" without needing concrete day offsets at rule time.

**locale-uk: `до кінця тижня / до кінця місяця`.** New `ukUntilEndOfRule` (priority 78) matches `Connector:to + Literal:__end_of__ + TimeUnit` and emits a `window` from today to `boundary(unit, 'end')`. Adds `кінця` / `кінець` to the lexicon as the end-of marker, plus missing `тижня` / `тижнем` (genitive/instrumental singular of `тиждень`). Closes "GAP-9" for week and month — year is still gated on `року` being in the skip set; deferring.
