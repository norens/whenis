# @whenis/locale-en

[![npm](https://img.shields.io/npm/v/@whenis/locale-en)](https://www.npmjs.com/package/@whenis/locale-en)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

English locale for [whenis](https://github.com/norens/whenis).

Basic English vocabulary and rules for relative dates. The English locale
exists primarily as a sanity check that the locale-as-data design holds
across language families; it is intentionally narrow at v0.1 and will be
fleshed out as use cases appear.

Covered today:

- `today` / `tomorrow` / `yesterday`
- `next <weekday>` / `this <weekday>` / `last <weekday>`
- Numeral + time unit (`3 days`, `2 weeks`) → duration
- Months and weekdays as lexicon entries

## Install

```bash
pnpm add @whenis/core @whenis/locale-en
```

## Usage

```ts
import { createParser } from '@whenis/core';
import { en } from '@whenis/locale-en';

const parser = createParser({ locales: [en], options: { preferFuture: true } });

parser.parse('next Friday', { reference: new Date('2026-05-28') });
// → matches[0].candidates[0]: { type: 'date', date: '2026-06-05', confidence: 1 }

parser.parse('tomorrow',    { reference: new Date('2026-05-28') });
// → matches[0].candidates[0]: { type: 'date', date: '2026-05-29', confidence: 1 }
```

## License

[MIT](./LICENSE) © Nazar Fedyshyn
