const MAX_DISPLAY_SECONDS = 99 * 60 + 59;

export function formatClock(totalSeconds: number): string {
  const clamped = Math.min(Math.max(Math.trunc(totalSeconds), 0), MAX_DISPLAY_SECONDS);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
