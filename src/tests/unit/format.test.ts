import { describe, it, expect } from 'vitest';
import { adjustClockDigit, formatClock } from '@/ui/components/flipclock/format';

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

describe('adjustClockDigit', () => {
  const shown = (seconds: number, index: number, delta: number) => formatClock(adjustClockDigit(seconds, index, delta));

  it('steps each column by its own place value', () => {
    expect(shown(0, 0, 1)).toBe('10:00');
    expect(shown(0, 1, 1)).toBe('01:00');
    expect(shown(0, 3, 1)).toBe('00:10');
    expect(shown(0, 4, 1)).toBe('00:01');
  });

  it('wraps a column without disturbing its neighbours', () => {
    expect(shown(9 * 60 + 9, 1, 1)).toBe('00:09');
    expect(shown(59, 4, 1)).toBe('00:50');
    expect(shown(50, 3, 1)).toBe('00:00');
    expect(shown(90 * 60, 0, 1)).toBe('00:00');
  });

  it('wraps downwards from zero', () => {
    expect(shown(0, 4, -1)).toBe('00:09');
    expect(shown(0, 3, -1)).toBe('00:50');
    expect(shown(0, 0, -1)).toBe('90:00');
  });

  it('caps the seconds tens column at five', () => {
    expect(shown(59, 3, 1)).toBe('00:09');
  });

  it('ignores the separator and out-of-range columns', () => {
    expect(shown(65, 2, 1)).toBe('01:05');
    expect(shown(65, 9, -1)).toBe('01:05');
  });
});
