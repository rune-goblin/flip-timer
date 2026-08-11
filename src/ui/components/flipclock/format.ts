import { MAX_TIMER_SECONDS } from '@/constants';

export function clampClockSeconds(totalSeconds: number): number {
  return Math.min(Math.max(Math.trunc(totalSeconds), 0), MAX_TIMER_SECONDS);
}

export function formatClock(totalSeconds: number): string {
  const clamped = clampClockSeconds(totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface ClockPlace {
  /** How many values this column cycles through before repeating. */
  modulus: number;
  /** Seconds one step of this column is worth. */
  weight: number;
  /** Suffix of the `decagone-timer.timer.places.*` string naming this column. */
  name: string;
}

/** Keyed by index into the "MM:SS" the clock renders. */
export const CLOCK_PLACES: Record<number, ClockPlace> = {
  0: { modulus: 10, weight: 600, name: 'minutesTens' },
  1: { modulus: 10, weight: 60, name: 'minutesOnes' },
  3: { modulus: 6, weight: 10, name: 'secondsTens' },
  4: { modulus: 10, weight: 1, name: 'secondsOnes' },
};

// Each column wraps within itself rather than carrying, so nudging one digit never
// moves its neighbours — the face behaves like the physical clock it imitates.
export function adjustClockDigit(totalSeconds: number, index: number, delta: number): number {
  const clamped = clampClockSeconds(totalSeconds);
  const place = CLOCK_PLACES[index];
  if (!place) return clamped;
  const digit = Number(formatClock(clamped)[index]);
  const { modulus } = place;
  const next = (((digit + delta) % modulus) + modulus) % modulus;
  return clamped + (next - digit) * place.weight;
}
