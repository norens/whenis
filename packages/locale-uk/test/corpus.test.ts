import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createParser } from '@whenis/core';
import { uk } from '../src/index';
import { booking } from '@whenis/booking';

const __dirname = dirname(fileURLToPath(import.meta.url));
const parser = createParser({ locales: [uk], plugins: [booking] });

interface CorpusEntry {
  input: string;
  reference: string;
  expected_date?: string;
  expected_range?: { start: string; end: string; nights?: number };
  expected_window?: { start: string; end: string };
  expected_duration?: number;
  expected_reason?: string;
}

const corpusPath = resolvePath(__dirname, 'corpus.jsonl');
const lines = readFileSync(corpusPath, 'utf-8').trim().split('\n');
const entries: CorpusEntry[] = lines.map(l => JSON.parse(l));

describe.each(entries)('corpus: $input (ref $reference)', (entry) => {
  it('parses to expected resolution', () => {
    const result = parser.parse(entry.input, {
      reference: new Date(`${entry.reference}T00:00:00.000Z`),
      timezone: 'UTC',
    });
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0]!.candidates[0]!;
    if (entry.expected_date) {
      expect(top.date).toBe(entry.expected_date);
    }
    if (entry.expected_range) {
      expect(top.start).toBe(entry.expected_range.start);
      expect(top.end).toBe(entry.expected_range.end);
      if (entry.expected_range.nights !== undefined) {
        expect(top.nights).toBe(entry.expected_range.nights);
      }
    }
    if (entry.expected_window) {
      expect(top.type).toBe('window');
      expect(top.start).toBe(entry.expected_window.start);
      expect(top.end).toBe(entry.expected_window.end);
    }
    if (entry.expected_duration !== undefined) {
      expect(top.nights).toBe(entry.expected_duration);
    }
    if (entry.expected_reason) {
      expect(top.reason).toBe(entry.expected_reason);
    }
  });
});
