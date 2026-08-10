import { describe, it, expect } from 'vitest';
import { formatClock } from '@/ui/components/flipclock/format';

describe('formatClock', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('clamps negatives to zero', () => {
    expect(formatClock(-5)).toBe('00:00');
  });

  it('caps the display at 99:59', () => {
    expect(formatClock(100 * 60)).toBe('99:59');
  });

  it('truncates fractional seconds', () => {
    expect(formatClock(59.9)).toBe('00:59');
  });
});
