import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

vi.stubGlobal('game', {
  user: { isGM: true },
  settings: { set: vi.fn() },
  socket: { emit: vi.fn() },
});

const { timer, DEFAULT_STATE } = await import('@/timer/store.svelte');

describe('split timer', () => {
  beforeEach(() => {
    timer.apply(DEFAULT_STATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (seconds: number) => vi.setSystemTime(Date.now() + seconds * 1000);

  it('parks the time the main clock is showing', () => {
    timer.setRemaining(125);
    timer.splitOff();
    expect(timer.splits).toEqual([125]);
  });

  it('parks the live countdown, not the stored remaining', () => {
    vi.useFakeTimers();
    timer.setRemaining(100);
    timer.start();
    advance(30);
    timer.splitOff();
    expect(timer.splits).toEqual([70]);
    expect(timer.remaining).toBe(100);
  });

  it('holds while the main clock ticks', () => {
    vi.useFakeTimers();
    timer.setRemaining(100);
    timer.splitOff();
    timer.start();
    advance(40);
    expect(timer.splits).toEqual([100]);
    expect(timer.live()).toBe(60);
  });

  it('stacks splits oldest first up to the cap', () => {
    for (const seconds of [10, 20, 30, 40]) {
      timer.setRemaining(seconds);
      timer.splitOff();
    }
    expect(timer.splits).toEqual([10, 20, 30]);
  });

  it('swaps the chosen split onto the face and pauses the main clock', () => {
    for (const seconds of [10, 20, 30]) {
      timer.setRemaining(seconds);
      timer.splitOff();
    }
    timer.setRemaining(200);
    timer.start();
    timer.swapSplit(1);
    expect(timer.running).toBe(false);
    expect(timer.remaining).toBe(20);
    expect(timer.splits).toEqual([10, 200, 30]);
  });

  it('leaves duration alone so reset still restores the configured length', () => {
    timer.setDurationMinutes(5);
    timer.setRemaining(60);
    timer.splitOff();
    timer.swapSplit(0);
    timer.reset();
    expect(timer.remaining).toBe(300);
  });

  it('merges by dropping just that split', () => {
    for (const seconds of [10, 20, 30]) {
      timer.setRemaining(seconds);
      timer.splitOff();
    }
    timer.mergeSplit(1);
    expect(timer.splits).toEqual([10, 30]);
  });

  it('ignores a missing split', () => {
    timer.setRemaining(60);
    timer.swapSplit(0);
    timer.mergeSplit(2);
    expect(timer.splits).toEqual([]);
    expect(timer.remaining).toBe(60);
  });

  it('round-trips through a sync snapshot', () => {
    timer.setRemaining(90);
    timer.splitOff();
    const synced = timer.snapshot();
    timer.apply({ ...synced, splits: [] });
    expect(timer.splits).toEqual([]);
    timer.apply(synced);
    expect(timer.splits).toEqual([90]);
  });
});
