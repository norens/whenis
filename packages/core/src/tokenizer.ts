import type { Locale } from './locale';
import type { Tag, Token } from './tags';

const NUMBER_RE = /^-?\d+(?:\.\d+)*$/;
/** DD.MM, DD.MM.YYYY, or DD.MM-DD.MM. Tokens matching this stay as Literals so
 *  date rules can interpret them — without the guard, NUMBER_RE would swallow
 *  `15.07` as the float 15.07 and `12.06.2025` as NaN. */
const NUMERIC_DATE_RE = /^\d{1,2}\.\d{1,2}(?:\.\d{4}|-\d{1,2}\.\d{1,2})?$/;

export function tokenize(input: string, locale: Locale): Token[] {
  // Apply preprocess chain
  let text = input;
  for (const fn of locale.preprocess) text = fn(text);

  const tokens: Token[] = [];
  const original = input;
  // Preprocess must be length-preserving so positions stay caller-meaningful.
  if (original.length !== text.length) {
    throw new Error('whenis: preprocess must be length-preserving in v0.1');
  }
  const splitRe = /\s+/g;
  let m: RegExpExecArray | null;
  let pos = 0;
  while ((m = splitRe.exec(text)) !== null || pos < text.length) {
    const end = m ? m.index : text.length;
    if (end > pos) {
      const tokText = text.slice(pos, end);
      if (!locale.skip?.has(tokText)) {
        tokens.push({
          text: original.slice(pos, end),
          start: pos,
          end,
          tags: classifyToken(tokText, locale),
        });
      }
    }
    if (!m) break;
    pos = m.index + m[0].length;
  }
  return tokens;
}

function classifyToken(token: string, locale: Locale): Tag[] {
  // 1) Exact lexicon hit
  const exact = locale.lexicon.get(token);
  if (exact && exact.length > 0) return [...exact];

  // 2) Numeric date — DD.MM / DD.MM.YYYY / DD.MM-DD.MM
  // Checked before the numeric fallback so `15.07` doesn't become a float.
  if (NUMERIC_DATE_RE.test(token)) {
    return [{ kind: 'Literal', text: token }];
  }

  // 3) Numeric
  if (NUMBER_RE.test(token)) {
    return [{ kind: 'Numeral', value: Number(token) }];
  }

  // 4) Stem fallback (first matching stem wins)
  for (const [re, tags] of locale.stems) {
    if (re.test(token)) return [...tags];
  }

  // 5) Literal
  return [{ kind: 'Literal', text: token }];
}
