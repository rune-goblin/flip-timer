import { MAX_SPLITS, MAX_TIMER_MINUTES, MAX_TIMER_SECONDS, MODULE_ID } from '@/constants';
import { broadcastTimerSync } from './socket';

export const SETTING_STATE = 'state';

export interface TimerSyncState {
  visible: boolean;
  running: boolean;
  /** Epoch ms deadline; meaningful only while running. */
  endAt: number;
  /** Seconds left; authoritative while paused. */
  remaining: number;
  /** Configured countdown length in seconds. */
  duration: number;
  /** Seconds parked beside the main clock, oldest first, at most MAX_SPLITS. Each
   *  is its own timeline in the sense that matters here: it never ticks, so it
   *  holds while the main clock runs. */
  splits: number[];
}

const clampSeconds = (seconds: number): number =>
  Math.min(Math.max(Math.trunc(seconds), 0), MAX_TIMER_SECONDS);

export const DEFAULT_STATE: TimerSyncState = {
  visible: false,
  running: false,
  endAt: 0,
  remaining: 300,
  duration: 300,
  splits: [],
};

// GM-authority: only the GM's client mutates; every mutator publishes the new
// snapshot over the socket and persists it to a world setting (reload / late
// joiners). Player clients are read-only — they receive state via apply().
class TimerStore {
  visible = $state(DEFAULT_STATE.visible);
  running = $state(DEFAULT_STATE.running);
  endAt = $state(DEFAULT_STATE.endAt);
  remaining = $state(DEFAULT_STATE.remaining);
  duration = $state(DEFAULT_STATE.duration);
  splits = $state<number[]>([]);

  apply(state: Partial<TimerSyncState> | undefined): void {
    const s = { ...DEFAULT_STATE, ...state };
    this.visible = s.visible;
    this.running = s.running;
    this.endAt = s.endAt;
    this.remaining = s.remaining;
    this.duration = s.duration;
    this.splits = [...(s.splits ?? [])].slice(0, MAX_SPLITS);
  }

  snapshot(): TimerSyncState {
    return {
      visible: this.visible,
      running: this.running,
      endAt: this.endAt,
      remaining: this.remaining,
      duration: this.duration,
      splits: [...this.splits],
    };
  }

  /** Seconds the face is showing right now, running or not. */
  live(): number {
    return this.running ? Math.max(Math.ceil((this.endAt - Date.now()) / 1000), 0) : this.remaining;
  }

  setVisible(visible: boolean): void {
    if (!game.user.isGM || this.visible === visible) return;
    this.visible = visible;
    this.#publish();
  }

  toggleVisible(): void {
    this.setVisible(!this.visible);
  }

  /** `seconds` restarts the clock at that length, running or not; without it a running
   *  clock is left alone. Shows the panel, so a macro start is never invisible. */
  start(seconds?: number): void {
    if (!game.user.isGM) return;
    if (seconds !== undefined) this.remaining = clampSeconds(seconds);
    else if (this.running) return;
    if (this.remaining <= 0) return;
    this.endAt = Date.now() + this.remaining * 1000;
    this.running = true;
    this.visible = true;
    this.#publish();
  }

  pause(): void {
    if (!game.user.isGM || !this.running) return;
    this.remaining = this.live();
    this.running = false;
    this.#publish();
  }

  reset(): void {
    if (!game.user.isGM) return;
    this.running = false;
    this.remaining = this.duration;
    this.#publish();
  }

  /** GM override straight off the clock face; leaves `duration` alone so reset still
   *  restores the configured length. */
  setRemaining(seconds: number): void {
    if (!game.user.isGM) return;
    const next = clampSeconds(seconds);
    this.remaining = next;
    if (this.running) {
      if (next === 0) this.running = false;
      else this.endAt = Date.now() + next * 1000;
    }
    this.#publish();
  }

  setDurationMinutes(minutes: number): void {
    if (!game.user.isGM) return;
    this.duration = Math.min(Math.max(Math.trunc(minutes), 1), MAX_TIMER_MINUTES) * 60;
    if (!this.running) this.remaining = this.duration;
    this.#publish();
  }

  splitOff(): void {
    if (!game.user.isGM || this.splits.length >= MAX_SPLITS) return;
    this.splits.push(this.live());
    this.#publish();
  }

  /** Straight exchange: the split takes the face — paused, as it was parked — and the
   *  main clock's live time parks in its place. */
  swapSplit(index: number): void {
    if (!game.user.isGM) return;
    const parked = this.splits[index];
    if (parked === undefined) return;
    this.splits[index] = this.live();
    this.running = false;
    this.endAt = 0;
    this.remaining = parked;
    this.#publish();
  }

  mergeSplit(index: number): void {
    if (!game.user.isGM || this.splits[index] === undefined) return;
    this.splits.splice(index, 1);
    this.#publish();
  }

  /** Every ticker calls this at zero; on player clients it is a no-op and their
   *  display just clamps at 00:00 until the GM's sync lands. */
  finish(): void {
    if (!game.user.isGM || !this.running) return;
    this.running = false;
    this.remaining = 0;
    this.#publish();
  }

  #publish(): void {
    const snapshot = this.snapshot();
    void game.settings.set(MODULE_ID, SETTING_STATE, snapshot);
    broadcastTimerSync(snapshot);
  }
}

export const timer = new TimerStore();
