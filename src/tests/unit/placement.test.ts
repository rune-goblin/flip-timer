import { describe, it, expect } from 'vitest';
import { clampPosition, readPosition } from '@/timer/placement';

const panel = { width: 200, height: 100 };
const screen = { width: 1000, height: 600 };

describe('clampPosition', () => {
  it('leaves a position that already fits', () => {
    expect(clampPosition({ x: 300, y: 200 }, panel, screen)).toEqual({ x: 300, y: 200 });
  });

  it('pulls the panel back inside the viewport', () => {
    expect(clampPosition({ x: -80, y: -80 }, panel, screen)).toEqual({ x: 40, y: 40 });
    expect(clampPosition({ x: 5000, y: 5000 }, panel, screen)).toEqual({ x: 760, y: 460 });
  });

  it('keeps the handle reachable when the panel is wider than the window', () => {
    expect(clampPosition({ x: 400, y: 400 }, { width: 2000, height: 1200 }, screen)).toEqual({ x: 40, y: 40 });
  });
});

describe('readPosition', () => {
  it('accepts a finite pair', () => {
    expect(readPosition({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
  });

  it('treats anything else as unplaced', () => {
    expect(readPosition({})).toBeNull();
    expect(readPosition(undefined)).toBeNull();
    expect(readPosition({ x: 10 })).toBeNull();
    expect(readPosition({ x: Number.NaN, y: 0 })).toBeNull();
  });
});
