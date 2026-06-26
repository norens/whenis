---
"@whenis/core": minor
"@whenis/locale-uk": minor
"@whenis/locale-en": minor
"@whenis/booking": minor
---

**Two fully-qualified dates range — month on both sides**

UA locale now parses ranges where **both** endpoints carry their own month (name or `DD.MM`),
joined by `по` / `до` / a bare dash, with or without a leading `з` / `від`:

- `з 26 липня по 28 липня` / `26 липня по 28 липня` → Jul 26 → Jul 29 (inclusive, `по` = last night)
- `з 26 липня до 28 липня` → Jul 26 → Jul 28 (checkout convention, `до`)
- `26 липня - 28 липня` / `26 липня – 28 липня` → checkout convention (bare dash)
- `30 липня по 2 серпня` → cross-month ranges resolve correctly
- `з 26.07 по 28.07` → `DD.MM` on both sides
- cross-year wrap (`28 грудня по 3 січня`) rolls the end into the next year via the resolver's
  per-endpoint future-year roll
- same-month reversed pairs (`28 липня по 26 липня`) are rejected as typos

Three compound rules consume the already-reduced `absolute` node on each side, so they compose with
month-name and `DD.MM` spellings without tokenizer changes. Previously these phrases dropped the end
date and resolved to a single check-in.
