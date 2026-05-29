---
'@whenis/core': minor
'@whenis/locale-uk': minor
'@whenis/locale-en': minor
'@whenis/booking': minor
---

Optional pattern items in the rule engine + three v0.2 backlog fixes.

**Core: `PatternItem.optional?: boolean`.** The rule engine now enumerates subsets of optional pattern items, preferring longer (more-specific) matches first. `produce()` receives `Array<Token | IRNode | null>` where indices of skipped optionals are `null`. Rules without optionals are unaffected — they never observe `null`. Inspired by Chronic's `?`-suffixed pattern elements; eliminates rule duplication for filler-word variants.

**locale-uk: `ці` / `цих` / `цими`** as `Pointer:this`. Closes "GAP-4" — `ці вихідні` now resolves to the current ISO week's Sat–Sun.

**locale-uk: bare `через тиждень` / `через місяць`.** `ukThroughNRule`'s `Numeral` slot is now optional with a default value of `1`. Closes "GAP-6" without rule duplication.

**locale-uk: `наступних` / `наступним` / `наступними`** as `Grabber:next` (genitive plural and instrumental forms that were missing).

**booking: `впродовж наступних N днів`.** `windowWithinNRule` (and the «у/в»-prefixed variant) now accept an optional `Grabber:next` filler between `within` and `Numeral`. Closes "GAP-8".
