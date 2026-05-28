---
"@whenis/core": patch
"@whenis/locale-uk": patch
"@whenis/locale-en": patch
"@whenis/booking": patch
---

Use static MIT license badge in READMEs. The shields.io `npm/l/...`
endpoint shows "package not found" for the first few hours after a
scoped package is published, since shields can't immediately crawl
license metadata. Static badges are always correct and don't depend on
crawler timing. Also drop the `color=cb3837` override on the npm
version badge — it read as an alarm next to the broken license one.
