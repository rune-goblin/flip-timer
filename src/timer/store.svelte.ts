import { MODULE_ID } from '@/constants';
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
}

export const DEFAULT_STATE: TimerSyncState = {
  visible: false,
  running: false,
  endAt: 0,
  remaining: 300,
  duration: 300,
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

  apply(state: Partial<TimerSyncState> | undefined): void {
    const s = { ...DEFAULT_STATE, ...state };
    this.visible = s.visible;
    this.running = s.running;
    this.endAt = s.endAt;
    this.remaining = s.remaining;
    this.duration = s.duration;
  }

  snapshot(): TimerSyncState {
    return {
      visible: this.visible,
      running: this.running,
      endAt: this.endAt,
      remaining: this.remaining,
      duration: this.duration,
    };
  }

  toggleVisible(): void {
    if (!game.user.isGM) return;
    this.visible = !this.visible;
    this.#publish();
  }

  start(): void {
    if (!game.user.isGM || this.running || this.remaining <= 0) return;
    this.endAt = Date.now() + this.remaining * 1000;
    this.running = true;
    this.#publish();
  }

  pause(): void {
    if (!game.user.isGM || !this.running) return;
    this.remaining = Math.max(Math.ceil((this.endAt - Date.now()) / 1000), 0);
    this.running = false;
    this.#publish();
  }

  reset(): void {
    if (!game.user.isGM) return;
    this.running = false;
    this.remaining = this.duration;
    this.#publish();
  }

  setDurationMinutes(minutes: number): void {
    if (!game.user.isGM) return;
    this.duration = Math.min(Math.max(Math.trunc(minutes), 1), 99) * 60;
    if (!this.running) this.remaining = this.duration;
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
