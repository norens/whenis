# @whenis/booking

[![npm](https://img.shields.io/npm/v/@whenis/booking)](https://www.npmjs.com/package/@whenis/booking)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Booking-domain plugin for [whenis](https://github.com/norens/whenis).

A worked example of the plugin API — adds rules, lexicon entries, and an
enricher specific to hospitality / booking assistants while keeping the core
parser domain-neutral.

## What it adds

| Pattern                              | Produces                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| `на N ночей / днів`                  | `duration` IR with `nights = N`                                     |
| `впродовж N днів`, `у найближчі N днів` | `window` IR (start = ref, end = ref + N − 1)                   |
| `наступні вихідні` / `ці вихідні`    | `range` IR for Saturday–Sunday with correct week selection          |
| `після свят`, `на свята`             | `fuzzy` IR with `reason: 'holiday_ref'`                             |
| **Enricher:** `mostlyPastEnricher`   | Adds `metadata.suggest_next_month = true` when the referenced month is ≥ 75 % elapsed |

## Install

```bash
pnpm add @whenis/core @whenis/locale-uk @whenis/booking
```

## Usage

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';
import { booking } from '@whenis/booking';

const parser = createParser({
  locales: [uk],
  plugins: [booking],
  options: { preferFuture: true },
});
const ref = new Date('2026-05-28');

parser.parse('на 3 ночі',       { reference: ref }).matches[0].candidates[0];
// → { type: 'duration', nights: 3, confidence: 1 }

parser.parse('впродовж 7 днів', { reference: ref }).matches[0].candidates[0];
// → { type: 'window', start: '2026-05-28', end: '2026-06-03', confidence: 1 }

parser.parse('після свят',      { reference: ref }).matches[0].candidates[0];
// → { type: 'fuzzy', reason: 'holiday_ref', confidence: 0.3,
//     metadata: { suggest_next_month: true } }
```

## License

[MIT](./LICENSE) © Nazar Fedyshyn
