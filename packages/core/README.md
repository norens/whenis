# @whenis/core

[![npm](https://img.shields.io/npm/v/@whenis/core)](https://www.npmjs.com/package/@whenis/core)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![types](https://img.shields.io/npm/types/@whenis/core)](https://www.typescriptlang.org/)

Engine for [whenis](https://github.com/norens/whenis) — a TypeScript natural-language date parser.

This package contains the tokenizer, rule engine, resolver, and the public
`Locale` / `Plugin` / `Rule` interfaces. It has no locale data of its own —
pair it with `@whenis/locale-uk`, `@whenis/locale-en`, or your own locale.

## Install

```bash
pnpm add @whenis/core @whenis/locale-uk
```

## Usage

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk], options: { preferFuture: true } });

const result = parser.parse("наступної п'ятниці", { reference: new Date('2026-05-28') });
console.log(result.matches[0].candidates[0]);
// { confidence: 1, type: 'date', date: '2026-06-05', granularity: 'day' }
```

## API

```ts
createParser({
  locales: Locale[];
  plugins?: Plugin[];
  options?: { preferFuture?: boolean };
}): Parser;

parser.parse(input: string, opts: { reference: Date; timezone?: string }): ParseResult;
```

Exported types: `Locale`, `Plugin`, `Rule`, `PatternItem`, `ResolverCtx`,
`IRTypeExt`, `Enricher`, `Tag`, `Token`, `IRNode`, `IRSpan`, `ParseOptions`,
`ParseResult`, `Match`, `ResolvedDate`.

Re-exported helpers: `tokenize`, `runRules`, `resolve`, `baseRules`.

See the [root README](https://github.com/norens/whenis#readme) for the full
output shape, the multi-candidate model, and the architecture diagram.

## License

[MIT](./LICENSE) © Nazar Fedyshyn
