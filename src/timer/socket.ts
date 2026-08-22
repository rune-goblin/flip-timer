import { MODULE_ID } from '@/constants';
import type { Cue } from './cues';
import type { TimerSyncState } from './store.svelte';

const SOCKET_NAME = `module.${MODULE_ID}`;

type TimerMessage = { action: 'sync'; data: TimerSyncState } | { action: 'cue'; data: Cue };

export interface TimerSocketHandlers {
  onSync: (state: TimerSyncState) => void;
  onCue: (cue: Cue) => void;
}

// The callbacks are injected (index.ts wires them to the store) so this file has no
// store import and the store→socket dependency stays one-way.
export function initTimerSocket(handlers: TimerSocketHandlers): void {
  game.socket.on(SOCKET_NAME, (message: TimerMessage) => {
    if (message?.action === 'sync') handlers.onSync(message.data);
    else if (message?.action === 'cue') handlers.onCue(message.data);
  });
}

// Fire-and-forget, GM → everyone. Foundry does not echo an emit back to the
// sender, so the GM applies state locally before broadcasting.
export function broadcastTimerSync(data: TimerSyncState): void {
  game.socket.emit(SOCKET_NAME, { action: 'sync', data } satisfies TimerMessage);
}

/** A cue is a transient signal, never state: the chat whisper is its record. */
export function broadcastCue(data: Cue): void {
  game.socket.emit(SOCKET_NAME, { action: 'cue', data } satisfies TimerMessage);
}
