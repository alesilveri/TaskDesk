import { describe, expect, it } from 'vitest';
import { buildSmartSlots, buildSmartSuggestions, formatMinutes } from './time';

describe('time utils', () => {
  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(125)).toBe('2h 5m');
  });

  it('builds smart slots for gap', () => {
    const slots = buildSmartSlots(50, [15, 20]);
    expect(slots.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(50);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('builds smart suggestions with max 3 items', () => {
    const suggestions = buildSmartSuggestions(90, [15, 20]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});
