import { HOUR_SECONDS, MAX_TIMER_SECONDS } from '@/constants';

export function clampClockSeconds(totalSeconds: number): number {
  return Math.min(Math.max(Math.trunc(totalSeconds), 0), MAX_TIMER_SECONDS);
}

/** `"HH"`, or null below an hour — under that the column is absent, not zero. */
export function clockHours(totalSeconds: number): string | null {
  const clamped = clampClockSeconds(totalSeconds);
  if (clamped < HOUR_SECONDS) return null;
  return String(Math.floor(clamped / HOUR_SECONDS)).padStart(2, '0');
}

/** `"MM:SS"`, minutes rolling within the hour. */
export function clockMinutes(totalSeconds: number): string {
  const clamped = clampClockSeconds(totalSeconds);
  const minutes = Math.floor(clamped / 60) % 60;
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatClock(totalSeconds: number): string {
  const hours = clockHours(totalSeconds);
  const minutes = clockMinutes(totalSeconds);
  return hours ? `${hours}:${minutes}` : minutes;
}

export interface ClockPlace {
  /** Seconds one step of this column is worth. */
  weight: number;
  /** Suffix of the `flip-timer.timer.places.*` string naming this column. */
  name: string;
}

/** Keyed by index into the "MM:SS" the clock renders. */
export const CLOCK_PLACES: Record<number, ClockPlace> = {
  0: { weight: 600, name: 'minutesTens' },
  1: { weight: 60, name: 'minutesOnes' },
  3: { weight: 10, name: 'secondsTens' },
  4: { weight: 1, name: 'secondsOnes' },
};

/** Keyed by index into the "HH" the hours column renders. */
export const HOUR_PLACES: Record<number, ClockPlace> = {
  0: { weight: 10 * HOUR_SECONDS, name: 'hoursTens' },
  1: { weight: HOUR_SECONDS, name: 'hoursOnes' },
};

// A counter, not a rack of independent wheels: a column adds or subtracts its own
// place value from the total, so it carries into the columns above it — 59 minutes
// nudged up is an hour, and the hours column grows to hold it.
export function adjustClockDigit(totalSeconds: number, index: number, delta: number): number {
  const clamped = clampClockSeconds(totalSeconds);
  const place = CLOCK_PLACES[index];
  if (!place) return clamped;
  return clampClockSeconds(clamped + delta * place.weight);
}

export function adjustHourDigit(totalSeconds: number, index: number, delta: number): number {
  const clamped = clampClockSeconds(totalSeconds);
  const place = HOUR_PLACES[index];
  // A click landing on the column as it fades out finds no hours to adjust.
  if (!place || clockHours(clamped) === null) return clamped;
  return clampClockSeconds(clamped + delta * place.weight);
}
