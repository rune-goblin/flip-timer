import { MODULE_ID } from '@/constants';
import { ExampleApp } from '@/ui/ExampleApp';
import { TimerApp } from '@/ui/TimerApp';
import { timer, type TimerSyncState } from './store.svelte';
import { currentCues, cueSource, saveCues } from './alarms';
import { formatCues, toSeconds, type Cue } from './cues';
import { formatClock } from '@/ui/components/flipclock/format';

/** A snapshot for callers: `remaining` is the live countdown, not the parked value. */
export type TimerState = TimerSyncState;

/** A cue's time as a `"MM:SS"` code or a plain count of seconds. */
export interface CueInput {
  at: string | number;
  text: string;
}

export interface TimerApi {
  readonly version: string;
  /** Starts (or restarts at `seconds`) and shows the panel. */
  start(seconds?: number): boolean;
  /** Halts, keeping the time on the face. */
  pause(): boolean;
  /** Halts and restores the configured duration. */
  stop(): boolean;
  show(): boolean;
  hide(): boolean;
  toggle(): boolean;
  setDuration(minutes: number): boolean;
  setRemaining(seconds: number): boolean;
  split(): boolean;
  state(): TimerState;
  /** Cues the GM has set, in the order they fire. */
  cues(): Cue[];
  /** Replaces the cue sheet, from a `MM:SS  text` block or a list. */
  setCues(cues: string | CueInput[]): boolean;
  addCue(at: string | number, text: string): boolean;
  clearCues(): boolean;
  openExample(): void;
}

function gmOnly(): boolean {
  if (game.user.isGM) return true;
  ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.timer.gmOnly`));
  return false;
}

function rejectCue(): false {
  ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.timer.cueInvalid`));
  return false;
}

// Every mutator lands here: the GM check and the panel open/close both hang off it, so
// no caller can move the state without the overlay following.
function commit(mutate: () => void): boolean {
  if (!gmOnly()) return false;
  mutate();
  TimerApp.sync(timer.visible);
  return true;
}

export function createTimerApi(version: string): TimerApi {
  return {
    version,
    start: (seconds) => commit(() => timer.start(seconds)),
    pause: () => commit(() => timer.pause()),
    stop: () => commit(() => timer.reset()),
    show: () => commit(() => timer.setVisible(true)),
    hide: () => commit(() => timer.setVisible(false)),
    toggle: () => commit(() => timer.toggleVisible()),
    setDuration: (minutes) => commit(() => timer.setDurationMinutes(minutes)),
    setRemaining: (seconds) => commit(() => timer.setRemaining(seconds)),
    split: () => commit(() => timer.splitOff()),
    cues: () => currentCues(),
    setCues: (input) => {
      if (!gmOnly()) return false;
      if (typeof input === 'string') return commit(() => saveCues(input));
      const cues: Cue[] = [];
      for (const entry of input) {
        const at = toSeconds(entry?.at);
        const text = entry?.text?.trim();
        if (at === undefined || !text) return rejectCue();
        cues.push({ at, text });
      }
      return commit(() => saveCues(formatCues(cues)));
    },
    addCue: (at, text) => {
      if (!gmOnly()) return false;
      const seconds = toSeconds(at);
      const line = text?.trim();
      if (seconds === undefined || !line) return rejectCue();
      // Appended to the raw sheet, not to the parsed cues, so the GM's own comments
      // and ordering survive a macro writing to it.
      const existing = cueSource().replace(/\s+$/, '');
      const added = `${formatClock(seconds)}  ${line}`;
      return commit(() => saveCues(existing ? `${existing}\n${added}` : added));
    },
    clearCues: () => commit(() => saveCues('')),
    state: () => ({ ...timer.snapshot(), remaining: timer.live() }),
    openExample: () => ExampleApp.open(),
  };
}
