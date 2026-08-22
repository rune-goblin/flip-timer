import './styles.css';
import { MODULE_ID, SETTING_COMPACT } from './constants';
import { DEFAULT_STATE, SETTING_STATE, timer, type TimerSyncState } from './timer/store.svelte';
import { SETTING_POSITION } from './timer/placement';
import { initTimerSocket } from './timer/socket';
import { createTimerApi, type TimerApi } from './timer/api';
import { cueField, loadCues, SETTING_CUES, showCue, startCueWatcher } from './timer/alarms';
import { TimerApp } from './ui/TimerApp';

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | init`);
  // GM-owned persistence only — live propagation is the socket, so no onChange.
  game.settings.register(MODULE_ID, SETTING_STATE, {
    name: `${MODULE_ID}.settings.state`,
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_STATE,
  });
  // Client-scoped: each user places and sizes the overlay to suit their screen.
  game.settings.register(MODULE_ID, SETTING_POSITION, {
    name: `${MODULE_ID}.settings.position`,
    scope: 'client',
    config: false,
    type: Object,
    default: {},
  });
  // The one setting the GM edits by hand: `MM:SS  text` per line, blanks and `#`
  // comments skipped. World-scoped, so every GM sees the same cue sheet.
  game.settings.register(MODULE_ID, SETTING_CUES, {
    name: `${MODULE_ID}.settings.cues`,
    hint: `${MODULE_ID}.settings.cuesHint`,
    scope: 'world',
    config: true,
    type: cueField(),
    default: '',
    onChange: () => {
      loadCues();
    },
  });
  game.settings.register(MODULE_ID, SETTING_COMPACT, {
    name: `${MODULE_ID}.settings.compact`,
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });
});

Hooks.once('ready', () => {
  initTimerSocket({
    onSync: (state) => {
      timer.apply(state);
      TimerApp.sync(timer.visible);
    },
    onCue: showCue,
  });
  timer.apply(game.settings.get(MODULE_ID, SETTING_STATE) as Partial<TimerSyncState>);
  TimerApp.sync(timer.visible);
  startCueWatcher();

  const module = game.modules.get(MODULE_ID);
  const version = module?.version ?? '0.0.0';
  const api = createTimerApi(version);
  // `api` is the Foundry convention for a public API, but isn't a typed field on Module.
  if (module) (module as { api?: TimerApi }).api = api;
  // Lets a dependent module grab the api without racing this hook.
  Hooks.callAll(`${MODULE_ID}.ready`, api);
  console.log(`${MODULE_ID} | ready (v${version})`);
});
