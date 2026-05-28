import type { Token, Tag } from './tags';
import type { IRNode } from './ir';
import type { ResolvedDate, ParseOptions } from './types';

export type PatternItem =
  | { kind: 'tag'; tag: Tag['kind']; predicate?: (t: Token) => boolean }
  | { kind: 'node'; node: IRNode['type'] };

export interface Rule {
  name: string;
  priority?: number;
  pattern: PatternItem[];
  produce: (matched: Array<Token | IRNode>) => IRNode | null;
}

export interface ResolverCtx {
  reference: Date;
  timezone: string;
  preferFuture: boolean;
}

export interface IRTypeExt {
  type: string;
  resolve: (node: IRNode, ctx: ResolverCtx) => ResolvedDate[];
}

export interface Enricher {
  apply: (candidate: ResolvedDate, ctx: ResolverCtx) => ResolvedDate;
}

export interface Plugin {
  name: string;
  tags?: Map<string, Tag[]>;
  rules?: Rule[];
  irExtensions?: IRTypeExt[];
  enrichers?: Enricher[];
}
