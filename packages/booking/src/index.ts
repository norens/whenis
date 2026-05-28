import type { Plugin } from '@whenis/core';
import { bookingRules, bookingTags } from './rules';

export const booking: Plugin = {
  name: '@whenis/booking',
  tags: bookingTags,
  rules: bookingRules,
};
