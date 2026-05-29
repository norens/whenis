import { DateTime } from 'luxon';
import type { Enricher, ResolverCtx, ResolvedDate } from '@whenis/core';

const DEFAULT_THRESHOLD = 0.75;

export const mostlyPastEnricher: Enricher = {
  apply(candidate: ResolvedDate, ctx: ResolverCtx): ResolvedDate {
    if (candidate.type !== 'fuzzy') return candidate;
    if (candidate.granularity !== 'month') return candidate;
    if (candidate.ref?.month === undefined) return candidate;
    const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
    if (candidate.ref.month !== ref.month) return candidate;
    const elapsed = ref.day / (ref.daysInMonth ?? 30);
    if (elapsed < DEFAULT_THRESHOLD) return candidate;
    return {
      ...candidate,
      metadata: { ...(candidate.metadata ?? {}), suggest_next_month: true },
    };
  },
};
