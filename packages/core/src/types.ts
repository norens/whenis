export interface ParseOptions {
  reference: Date;
  timezone?: string;
}

export interface ParseResult {
  source: string;
  matches: Match[];
}

export interface Match {
  text: string;
  start: number;
  end: number;
  candidates: ResolvedDate[];
}

export interface ResolvedDate {
  confidence: number;
  type: 'date' | 'range' | 'window' | 'duration' | 'fuzzy';
  date?: string;
  start?: string;
  end?: string;
  nights?: number;
  granularity?: 'day' | 'month' | 'year' | 'season';
  reason?: string;
  metadata?: Record<string, unknown>;
}
