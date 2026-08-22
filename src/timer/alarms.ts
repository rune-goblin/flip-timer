import { MODULE_ID } from '@/constants';
import { formatClock } from '@/ui/components/flipclock/format';
import { dueCues, parseCues, type Cue } from './cues';
import { broadcastCue } from './socket';
import { timer } from './store.svelte';

export const SETTING_CUES = 'cues';

/** Fast enough that a cue lands on the second it names, cheap enough to leave running. */
const SAMPLE_MS = 250;

let cues: Cue[] = [];
let applied: string | undefined;
let previous = 0;
let ticking = false;
let handle: ReturnType<typeof setInterval> | undefined;

type InputConfig = Parameters<foundry.data.fields.StringField['toInput']>[0];

// The settings sheet renders a StringField as a one-line input; a cue list needs room.
// `elementType` is a documented StringField input option the shipped typings predate.
class CueField extends foundry.data.fields.StringField {
  override toInput(config?: InputConfig): HTMLElement | HTMLCollection {
    return super.toInput({ ...config, elementType: 'textarea', rows: 8 } as InputConfig);
  }
}

export const cueField = (): CueField => new CueField({ initial: '' });

export function cueSource(): string {
  return (game.settings.get(MODULE_ID, SETTING_CUES) as string) ?? '';
}

// Idempotent, so the onChange that follows our own save is a no-op and the GM is not
// warned twice about the same bad line.
function applySource(next: string): Cue[] {
  if (next === applied) return cues;
  applied = next;
  const parsed = parseCues(next);
  cues = parsed.cues;
  if (parsed.rejected.length && game.user.isGM) {
    ui.notifications.warn(
      game.i18n.format(`${MODULE_ID}.timer.cueRejected`, { lines: parsed.rejected.join(', ') }),
    );
  }
  return cues;
}

export function loadCues(): Cue[] {
  return applySource(cueSource());
}

export function currentCues(): Cue[] {
  return cues.map((cue) => ({ ...cue }));
}

/** Takes effect here and now; the write propagates to the other GMs via onChange. */
export function saveCues(next: string): Cue[] {
  void game.settings.set(MODULE_ID, SETTING_CUES, next);
  return applySource(next);
}

/** Banner only — every GM client shows one, wherever the cue was detected. */
export function showCue(cue: Cue): void {
  if (!game.user.isGM) return;
  ui.notifications.info(
    game.i18n.format(`${MODULE_ID}.timer.cueFired`, { time: formatClock(cue.at), text: cue.text }),
  );
}

function announce(cue: Cue): void {
  showCue(cue);
  broadcastCue(cue);
  const ChatMessage = getDocumentClass('ChatMessage');
  void ChatMessage.create({
    content: `<strong>${formatClock(cue.at)}</strong> &mdash; ${foundry.utils.escapeHTML(cue.text)}`,
    speaker: { alias: game.i18n.localize(`${MODULE_ID}.title`) },
    whisper: ChatMessage.getWhisperRecipients('GM').map((user) => user.id),
  });
}

function sample(): void {
  const current = timer.live();
  const from = previous;
  const wasTicking = ticking;
  previous = current;
  ticking = timer.running;
  // wasTicking too: the clock stops itself the instant it hits zero, which can land
  // between two samples and would otherwise swallow a cue set for the last second.
  if (!ticking && !wasTicking) return;
  // Every GM tracks the face, so a late connection can't mistake its first sample for
  // a sweep, but only one announces — otherwise each cue whispers twice.
  if (game.users.activeGM?.id !== game.user.id) return;
  for (const cue of dueCues(cues, from, current)) announce(cue);
}

/** GM clients only: cues are the GM's own prompts, so no player ever samples. */
export function startCueWatcher(): void {
  if (!game.user.isGM || handle) return;
  loadCues();
  previous = timer.live();
  ticking = timer.running;
  handle = setInterval(sample, SAMPLE_MS);
}
