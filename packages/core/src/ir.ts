export type IRNode =
  | { type: 'absolute';   year?: number; month?: number; day?: number; weekday?: number }
  | { type: 'relative';   offset: { weeks?: number; days?: number; months?: number; years?: number }; direction: 'past' | 'future' | 'this' }
  | { type: 'weekday';    weekday: number; modifier: 'this' | 'next' | 'last' | 'nearest' }
  | { type: 'duration';   nights?: number; days?: number; weeks?: number }
  | { type: 'window';     from: IRNode; to: IRNode }
  | { type: 'range';      start: IRNode; end: IRNode; convention: 'checkout' | 'inclusive' }
  | { type: 'fuzzy';      granularity: 'month' | 'season' | 'year'; ref: IRNode; reason: string }
  | { type: 'boundary';   unit: 'week' | 'month' | 'year'; edge: 'start' | 'end' }
  | { type: 'offset_from'; base: IRNode; days: number }
  | { type: 'unresolved'; reason: string };

export interface IRSpan {
  node: IRNode;
  start: number;
  end: number;
}
