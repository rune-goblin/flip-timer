import { MODULE_ID } from '@/constants';
import type { TimerSyncState } from './store.svelte';

const SOCKET_NAME = `module.${MODULE_ID}`;

interface TimerMessage {
  action: 'sync';
  data: TimerSyncState;
}

// The callback is injected (index.ts wires it to the store) so this file has no
// store import and the store→socket dependency stays one-way.
export function initTimerSocket(onSync: (state: TimerSyncState) => void): void {
  game.socket.on(SOCKET_NAME, (message: TimerMessage) => {
    if (message?.action === 'sync') onSync(message.data);
  });
}

// Fire-and-forget, GM → everyone. Foundry does not echo an emit back to the
// sender, so the GM applies state locally before broadcasting.
export function broadcastTimerSync(data: TimerSyncState): void {
  game.socket.emit(SOCKET_NAME, { action: 'sync', data } satisfies TimerMessage);
}
