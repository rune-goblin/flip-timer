import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { timer } from '@/timer/store.svelte';

const published: unknown[] = [];

function stubGame(isGM: boolean): void {
  published.length = 0;
  Object.assign(globalThis, {
    game: {
      user: { isGM },
      settings: {
        set: (_module: string, _key: string, value: unknown) => {
          published.push(value);
          return Promise.resolve(value);
        },
      },
      socket: { emit: () => undefined },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  stubGame(true);
  timer.apply(undefined);
});

afterEach(() => vi.useRealTimers());

describe('start', () => {
  it('runs the parked time and shows the panel', () => {
    timer.start();
    expect(timer.running).toBe(true);
    expect(timer.visible).toBe(true);
    expect(timer.endAt).toBe(300_000);
  });

  it('leaves a running clock alone', () => {
    timer.start();
    vi.setSystemTime(10_000);
    timer.start();
    expect(timer.endAt).toBe(300_000);
  });

  it('restarts at the seconds it is given, running or not', () => {
    timer.start();
    vi.setSystemTime(10_000);
    timer.start(60);
    expect(timer.endAt).toBe(70_000);
  });

  it('refuses an exhausted clock', () => {
    timer.setRemaining(0);
    timer.start();
    expect(timer.running).toBe(false);
  });
});

describe('pause', () => {
  it('parks the live time', () => {
    timer.start();
    vi.setSystemTime(12_000);
    timer.pause();
    expect(timer.running).toBe(false);
    expect(timer.remaining).toBe(288);
    vi.setSystemTime(60_000);
    expect(timer.live()).toBe(288);
  });
});

describe('reset', () => {
  it('restores the configured duration', () => {
    timer.setDurationMinutes(2);
    timer.start();
    vi.setSystemTime(30_000);
    timer.reset();
    expect(timer.running).toBe(false);
    expect(timer.remaining).toBe(120);
  });
});

describe('visibility', () => {
  it('publishes only on a change', () => {
    timer.setVisible(true);
    const count = published.length;
    timer.setVisible(true);
    expect(published.length).toBe(count);
    timer.toggleVisible();
    expect(timer.visible).toBe(false);
  });
});

describe('player clients', () => {
  it('mutate nothing', () => {
    stubGame(false);
    timer.start();
    timer.setVisible(true);
    timer.setRemaining(10);
    expect(timer.running).toBe(false);
    expect(timer.visible).toBe(false);
    expect(timer.remaining).toBe(300);
    expect(published).toHaveLength(0);
  });
});
