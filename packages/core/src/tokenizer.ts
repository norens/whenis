import type { Locale } from './locale';
import type { Tag, Token } from './tags';

const NUMBER_RE = /^-?\d+(?:\.\d+)*$/;

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

  // 2) Numeric
  if (NUMBER_RE.test(token)) {
    return [{ kind: 'Numeral', value: Number(token) }];
  }

  // 3) Stem fallback (first matching stem wins)
  for (const [re, tags] of locale.stems) {
    if (re.test(token)) return [...tags];
  }

  // 4) Literal
  return [{ kind: 'Literal', text: token }];
}
