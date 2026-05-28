# @whenis/locale-uk

[![npm](https://img.shields.io/npm/v/@whenis/locale-uk?color=cb3837)](https://www.npmjs.com/package/@whenis/locale-uk)
[![license](https://img.shields.io/npm/l/@whenis/locale-uk?color=blue)](./LICENSE)

Ukrainian locale for [whenis](https://github.com/norens/whenis).

Ships a static, fully inflected lexicon (no runtime morphology engine) plus
locale-specific rules:

- All 12 months in 7 case forms (sichn'a / sichn'em / …).
- All 7 weekdays in 4 case forms.
- Pointers («наступний / минулий / цей / ця / це»), connectors
  («з / від / до / по / на»), time units, immediate keywords («сьогодні /
  завтра / вчора»).
- Apostrophe normalisation preprocess that handles iOS smart-quote
  auto-correct (`'`, `ʼ`, `′`, `´`, `` ` `` → `'`).
- Rules for `наступн* X`, day + month (`5 червня`), compound-month ranges
  (`з 5 по 10 червня`), `через N днів/тижнів` and more.

## Install

```bash
pnpm add @whenis/core @whenis/locale-uk
```

## Usage

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk], options: { preferFuture: true } });
const ref = new Date('2026-05-28');

parser.parse('через 3 дні',      { reference: ref }).matches[0].candidates[0];
// → { type: 'date', date: '2026-05-31', confidence: 1 }

parser.parse('з 5 по 10 червня', { reference: ref }).matches[0].candidates[0];
// → { type: 'range', start: '2026-06-05', end: '2026-06-11', nights: 6, confidence: 1 }
```

For booking-specific patterns («на 3 ночі», «впродовж 7 днів», «після свят»),
also load [`@whenis/booking`](https://www.npmjs.com/package/@whenis/booking).

## License

[MIT](./LICENSE) © Nazar Fedyshyn
