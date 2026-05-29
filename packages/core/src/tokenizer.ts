import type { Locale } from './locale';
import type { Tag, Token } from './tags';

const NUMBER_RE = /^-?\d+(?:\.\d+)*$/;
/** DD.MM, DD.MM.YYYY, or DD.MM-DD.MM. Tokens matching this stay as Literals so
 *  date rules can interpret them — without the guard, NUMBER_RE would swallow
 *  `15.07` as the float 15.07 and `12.06.2025` as NaN. */
// Allow optional NBSPs (U+00A0) around the dash — glueNumericRange replaces spaces with NBSP.
const NUMERIC_DATE_RE = /^\d{1,2}\.\d{1,2}(?:\.\d{4}|\u00a0*-\u00a0*\d{1,2}\.\d{1,2})?$/;

/**
 * Glue DD.MM ranges with surrounding whitespace into a single token.
 * Replaces ASCII spaces with NBSP (U+00A0, also 1 char) so the whole
 * `12.06 - 22.06` becomes one non-splitting unit. Length-preserving.
 */
function glueNumericRange(text: string): string {
  return text.replace(
    /(\d{1,2}\.\d{1,2})([\t ]+)-([\t ]+)(\d{1,2}\.\d{1,2})/g,
    (_, a: string, ws1: string, ws2: string, b: string) => `${a}${'\u00a0'.repeat(ws1.length)}-${'\u00a0'.repeat(ws2.length)}${b}`,
  );
}

export function tokenize(input: string, locale: Locale): Token[] {
  // Apply preprocess chain
  let text = input;
  for (const fn of locale.preprocess) text = fn(text);

  text = glueNumericRange(text);   // length-preserving: spaces → NBSP
  const tokens: Token[] = [];
  const original = input;
  // Preprocess must be length-preserving so positions stay caller-meaningful.
  if (original.length !== text.length) {
    throw new Error('whenis: preprocess must be length-preserving in v0.1');
  }
  // ASCII whitespace only; NBSP (U+00A0) is non-splitting so glued ranges stay intact.
  const splitRe = /[\t\n\r ]+/g;
  let m: RegExpExecArray | null;
  let pos = 0;
  while ((m = splitRe.exec(text)) !== null || pos < text.length) {
    const end = m ? m.index : text.length;
    if (end > pos) {
      const tokText = text.slice(pos, end);
      if (!locale.skip?.has(tokText)) {
        const classification = classifyToken(tokText, locale);
        const baseToken: Token = {
          text: original.slice(pos, end),
          start: pos,
          end,
          tags: classification.tags,
        };
        if (classification.source !== undefined) {
          baseToken.sourceLocale = classification.source;
        }
        tokens.push(baseToken);
      }
    }
    if (!m) break;
    pos = m.index + m[0].length;
  }
  return tokens;
}

function classifyToken(token: string, locale: Locale): { tags: Tag[]; source?: string } {
  // 1) Exact lexicon hit
  const exact = locale.lexicon.get(token);
  if (exact && exact.length > 0) {
    const source = locale.lexiconSource?.get(token);
    return source !== undefined ? { tags: [...exact], source } : { tags: [...exact] };
  }

  // 2) Numeric date — DD.MM / DD.MM.YYYY / DD.MM-DD.MM
  // Checked before the numeric fallback so `15.07` doesn't become a float.
  if (NUMERIC_DATE_RE.test(token)) {
    return { tags: [{ kind: 'Literal', text: token }] };
  }

  // 3) Numeric
  if (NUMBER_RE.test(token)) {
    return { tags: [{ kind: 'Numeral', value: Number(token) }] };
  }

  // 4) Stem fallback (first matching stem wins)
  for (let i = 0; i < locale.stems.length; i++) {
    const stem = locale.stems[i]!;
    const [re, tags] = stem;
    if (re.test(token)) {
      const source = locale.stemSource?.[i];
      return source !== undefined ? { tags: [...tags], source } : { tags: [...tags] };
    }
  }

  // 5) Literal
  return { tags: [{ kind: 'Literal', text: token }] };
}
