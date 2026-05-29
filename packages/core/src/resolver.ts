import { DateTime } from 'luxon';
import type { IRNode } from './ir.js';
import type { ResolvedDate } from './types.js';
import type { ResolverCtx } from './plugin.js';

export function resolve(node: IRNode, ctx: ResolverCtx): ResolvedDate[] {
  switch (node.type) {
    case 'absolute': {
      const date = resolveAbsolute(node, ctx);
      if (!date) return [{ confidence: 0, type: 'fuzzy', reason: 'invalid_absolute' }];
      // Signal past-ISO: when caller gave an explicit year+month+day and the
      // resolved date is before the reference, attach reason='past_iso' so the
      // caller (e.g. booking adapter) can decide to roll forward or flag.
      if (node.year !== undefined && node.month !== undefined && node.day !== undefined) {
        const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone }).startOf('day');
        const resolvedDt = DateTime.fromISO(date, { zone: ctx.timezone });
        if (resolvedDt < ref) {
          return [{ confidence: 1, type: 'date', date, granularity: 'day', reason: 'past_iso' }];
        }
      }
      return [{ confidence: 1, type: 'date', date, granularity: 'day' }];
    }
    case 'weekday':
      return resolveWeekday(node, ctx);
    case 'duration':
      return [{ confidence: 1, type: 'duration', ...(node.nights !== undefined ? { nights: node.nights } : {}) }];
    case 'range':
      return resolveRange(node, ctx);
    case 'window':
      return resolveWindow(node, ctx);
    case 'fuzzy':
      return [{ confidence: 0.3, type: 'fuzzy', reason: node.reason, granularity: node.granularity }];
    case 'unresolved':
      return [{ confidence: 0, type: 'fuzzy', reason: node.reason }];
    case 'relative':
      return resolveRelative(node, ctx);
    case 'boundary':
      return resolveBoundary(node, ctx);
    case 'offset_from':
      return resolveOffsetFrom(node, ctx);
  }
}

function resolveOffsetFrom(node: Extract<IRNode, { type: 'offset_from' }>, ctx: ResolverCtx): ResolvedDate[] {
  const base = resolve(node.base, ctx)[0];
  if (!base?.date) return [{ confidence: 0, type: 'fuzzy', reason: 'offset_base_unresolved' }];
  const dt = DateTime.fromISO(base.date, { zone: ctx.timezone }).plus({ days: node.days });
  return [{ confidence: 1, type: 'date', date: dt.toISODate()!, granularity: 'day' }];
}

function resolveBoundary(node: Extract<IRNode, { type: 'boundary' }>, ctx: ResolverCtx): ResolvedDate[] {
  const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
  const dt = node.edge === 'start' ? ref.startOf(node.unit) : ref.endOf(node.unit);
  return [{ confidence: 1, type: 'date', date: dt.toISODate()!, granularity: 'day' }];
}

function resolveAbsolute(node: Extract<IRNode, { type: 'absolute' }>, ctx: ResolverCtx): string | null {
  if (node.year && node.month && node.day) {
    const dt = DateTime.fromObject({ year: node.year, month: node.month, day: node.day }, { zone: ctx.timezone });
    return dt.isValid ? dt.toISODate() : null;
  }
  // Partial absolute (e.g., only month+day) — roll year by preference
  if (node.month && node.day) {
    const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
    let candidate = DateTime.fromObject({ year: ref.year, month: node.month, day: node.day }, { zone: ctx.timezone });
    if (!candidate.isValid) return null;
    if (ctx.preferFuture && candidate < ref.startOf('day')) {
      candidate = candidate.set({ year: ref.year + 1 });
    }
    return candidate.toISODate();
  }
  return null;
}

function resolveWeekday(node: Extract<IRNode, { type: 'weekday' }>, ctx: ResolverCtx): ResolvedDate[] {
  const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
  const startOfWeek = ref.startOf('week'); // Luxon: ISO week, Mon=1
  const startOfNextWeek = startOfWeek.plus({ days: 7 });
  const thisWeekTarget = startOfWeek.plus({ days: node.weekday - 1 });
  const nextWeekTarget = startOfNextWeek.plus({ days: node.weekday - 1 });

  switch (node.modifier) {
    case 'next': {
      return [{ confidence: 1, type: 'date', date: nextWeekTarget.toISODate()!, granularity: 'day' }];
    }
    case 'last': {
      const lastWeek = startOfWeek.minus({ days: 7 }).plus({ days: node.weekday - 1 });
      return [{ confidence: 1, type: 'date', date: lastWeek.toISODate()!, granularity: 'day' }];
    }
    case 'this': {
      if (thisWeekTarget < ref.startOf('day')) {
        return [
          { confidence: 0.3, type: 'date', date: thisWeekTarget.toISODate()!, granularity: 'day', reason: 'this_week_past' },
          { confidence: 0.6, type: 'date', date: nextWeekTarget.toISODate()!, granularity: 'day', reason: 'this_week_past_fallback_next' },
        ];
      }
      return [{ confidence: 1, type: 'date', date: thisWeekTarget.toISODate()!, granularity: 'day' }];
    }
    case 'nearest': {
      let delta = (node.weekday - ref.weekday + 7) % 7;
      if (delta === 0 && ctx.preferFuture) delta = 7;
      return [{ confidence: 0.7, type: 'date', date: ref.plus({ days: delta }).toISODate()!, granularity: 'day', reason: 'nearest_upcoming' }];
    }
  }
}

function resolveRange(node: Extract<IRNode, { type: 'range' }>, ctx: ResolverCtx): ResolvedDate[] {
  const startResolved = resolve(node.start, ctx)[0];
  const endResolved = resolve(node.end, ctx)[0];
  if (!startResolved?.date || !endResolved?.date) {
    return [{ confidence: 0, type: 'fuzzy', reason: 'range_resolve_failed' }];
  }
  const startDt = DateTime.fromISO(startResolved.date, { zone: ctx.timezone });
  let endDt = DateTime.fromISO(endResolved.date, { zone: ctx.timezone });
  let nights: number;
  if (node.convention === 'inclusive') {
    endDt = endDt.plus({ days: 1 });
    nights = Math.round(endDt.diff(startDt, 'days').days);
  } else {
    nights = Math.round(endDt.diff(startDt, 'days').days);
  }
  return [{
    confidence: 1,
    type: 'range',
    start: startDt.toISODate()!,
    end: endDt.toISODate()!,
    nights,
  }];
}

function resolveWindow(node: Extract<IRNode, { type: 'window' }>, ctx: ResolverCtx): ResolvedDate[] {
  const from = resolve(node.from, ctx)[0];
  const to = resolve(node.to, ctx)[0];
  if (!from?.date || !to?.date) return [{ confidence: 0, type: 'fuzzy', reason: 'window_resolve_failed' }];
  return [{ confidence: 1, type: 'window', start: from.date, end: to.date }];
}

function resolveRelative(node: Extract<IRNode, { type: 'relative' }>, ctx: ResolverCtx): ResolvedDate[] {
  const ref = DateTime.fromJSDate(ctx.reference, { zone: ctx.timezone });
  const sign = node.direction === 'past' ? -1 : node.direction === 'future' ? 1 : 0;
  const dt = ref.plus({
    days: sign * (node.offset.days ?? 0),
    weeks: sign * (node.offset.weeks ?? 0),
    months: sign * (node.offset.months ?? 0),
    years: sign * (node.offset.years ?? 0),
  });
  return [{ confidence: 1, type: 'date', date: dt.toISODate()!, granularity: 'day' }];
}
