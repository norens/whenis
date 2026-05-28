# whenis

Natural-language date parsing for TypeScript. Ukrainian + English. Plugin-extensible.

## Quickstart

```ts
import { createParser } from '@whenis/core';
import { uk } from '@whenis/locale-uk';

const parser = createParser({ locales: [uk] });
const result = parser.parse('наступної п\'ятниці', { reference: new Date() });
```

See `docs/design.md` for architecture.
