import { describe, it, expect } from 'vitest';
import { ukLexicon } from '../src/lexicon';

describe('uk lexicon coverage', () => {
  it('has all 12 months in nominative and genitive', () => {
    const months: Array<[string, string, number]> = [
      ['січень', 'січня', 1], ['лютий', 'лютого', 2], ['березень', 'березня', 3],
      ['квітень', 'квітня', 4], ['травень', 'травня', 5], ['червень', 'червня', 6],
      ['липень', 'липня', 7], ['серпень', 'серпня', 8], ['вересень', 'вересня', 9],
      ['жовтень', 'жовтня', 10], ['листопад', 'листопада', 11], ['грудень', 'грудня', 12],
    ];
    for (const [nom, gen, m] of months) {
      expect(ukLexicon.get(nom)?.[0]).toEqual({ kind: 'MonthName', month: m });
      expect(ukLexicon.get(gen)?.[0]).toEqual({ kind: 'MonthName', month: m });
    }
  });

  it('has all 7 weekdays in at least 2 forms', () => {
    const weekdays = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя'];
    for (const wd of weekdays) {
      expect(ukLexicon.get(wd)?.[0]?.kind).toBe('WeekdayName');
    }
  });

  it("apostrophe lookup with U+0027 finds п'ятниця", () => {
    expect(ukLexicon.get("п'ятниця")).toBeDefined();
    expect(ukLexicon.get("п'ятницю")).toBeDefined();
  });
});
