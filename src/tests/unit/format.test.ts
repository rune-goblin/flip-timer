import { describe, it, expect } from 'vitest';
import { adjustClockDigit, adjustHourDigit, clockHours, formatClock } from '@/ui/components/flipclock/format';

describe('formatClock', () => {
  it('pads minutes and seconds to two digits', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('clamps negatives to zero', () => {
    expect(formatClock(-5)).toBe('00:00');
  });

  it('grows an hours column past the hour', () => {
    expect(formatClock(3599)).toBe('59:59');
    expect(formatClock(3600)).toBe('01:00:00');
    expect(formatClock(3661)).toBe('01:01:01');
  });

  it('caps the display at 99:59:59', () => {
    expect(formatClock(100 * 3600)).toBe('99:59:59');
  });

  it('truncates fractional seconds', () => {
    expect(formatClock(59.9)).toBe('00:59');
  });
});

describe('clockHours', () => {
  it('is absent below an hour and two digits above it', () => {
    expect(clockHours(3599)).toBeNull();
    expect(clockHours(3600)).toBe('01');
    expect(clockHours(12 * 3600)).toBe('12');
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

  it('carries into the columns above it', () => {
    expect(shown(9 * 60 + 30, 1, 1)).toBe('10:30');
    expect(shown(59, 4, 1)).toBe('01:00');
    expect(shown(50, 3, 1)).toBe('01:00');
  });

  it('grows the hours column when the minutes pass 59', () => {
    expect(shown(59 * 60, 1, 1)).toBe('01:00:00');
    expect(shown(50 * 60, 0, 1)).toBe('01:00:00');
  });

  it('borrows back out of the hours column', () => {
    expect(shown(3600, 1, -1)).toBe('59:00');
    expect(shown(3600, 0, -1)).toBe('50:00');
  });

  it('clamps at zero instead of wrapping', () => {
    expect(shown(0, 4, -1)).toBe('00:00');
    expect(shown(0, 0, -1)).toBe('00:00');
    expect(shown(30, 1, -1)).toBe('00:00');
  });

  it('clamps at the top of the face', () => {
    expect(shown(99 * 3600 + 59 * 60, 0, 1)).toBe('99:59:59');
  });

  it('ignores the separator and out-of-range columns', () => {
    expect(shown(65, 2, 1)).toBe('01:05');
    expect(shown(65, 9, -1)).toBe('01:05');
  });
});

describe('adjustHourDigit', () => {
  const shown = (seconds: number, index: number, delta: number) => formatClock(adjustHourDigit(seconds, index, delta));

  it('steps each hours column by its own place value', () => {
    expect(shown(3600, 1, 1)).toBe('02:00:00');
    expect(shown(3600, 0, 1)).toBe('11:00:00');
  });

  it('carries and clamps like the rest of the face', () => {
    expect(shown(9 * 3600 + 61, 1, 1)).toBe('10:01:01');
    expect(shown(95 * 3600, 0, 1)).toBe('99:59:59');
  });

  it('drops the column when the last hour goes', () => {
    expect(shown(3600 + 61, 1, -1)).toBe('01:01');
  });

  it('does nothing below an hour, where there is no column to adjust', () => {
    expect(shown(3599, 1, 1)).toBe('59:59');
  });

  it('ignores columns the hours face does not have', () => {
    expect(shown(3661, 2, 1)).toBe('01:01:01');
  });
});
