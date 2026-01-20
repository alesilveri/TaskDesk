import { describe, expect, it } from 'vitest';
import { validateActivityInput } from './validation';

const base = {
  date: '2026-01-20',
  title: 'Test',
  minutes: 30,
  status: 'bozza',
  inGestore: false,
  verbaleDone: false,
};

describe('validation', () => {
  it('accepts valid activity', () => {
    expect(validateActivityInput(base)).toHaveLength(0);
  });

  it('rejects empty title', () => {
    expect(validateActivityInput({ ...base, title: '' }).length).toBeGreaterThan(0);
  });

  it('rejects out of range minutes', () => {
    expect(validateActivityInput({ ...base, minutes: 1 }).length).toBeGreaterThan(0);
  });
});
