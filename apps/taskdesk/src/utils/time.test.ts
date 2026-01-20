import { describe, expect, it } from 'vitest';
import { buildSmartSlots, formatMinutes } from './time';

describe('time utils', () => {
  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(125)).toBe('2h 5m');
  });

  it('builds smart slots for gap', () => {
    const slots = buildSmartSlots(50, [15, 20]);
    expect(slots.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(50);
    expect(slots.length).toBeGreaterThan(0);
  });
});
