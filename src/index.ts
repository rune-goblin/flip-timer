import './styles.css';
import { MODULE_ID } from './constants';
import { DEFAULT_STATE, SETTING_STATE, timer, type TimerSyncState } from './timer/store.svelte';
import { initTimerSocket } from './timer/socket';
import { ExampleApp } from './ui/ExampleApp';
import { TimerApp } from './ui/TimerApp';

interface ModuleApi {
  version: string;
  toggle: () => void;
  openExample: () => void;
}

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
});

Hooks.once('ready', () => {
  initTimerSocket((state) => {
    timer.apply(state);
    TimerApp.sync(timer.visible);
  });
  timer.apply(game.settings.get(MODULE_ID, SETTING_STATE) as Partial<TimerSyncState>);
  TimerApp.sync(timer.visible);

  const module = game.modules.get(MODULE_ID);
  const version = module?.version ?? '0.0.0';
  const api: ModuleApi = {
    version,
    toggle: () => {
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.timer.gmOnly`));
        return;
      }
      timer.toggleVisible();
      TimerApp.sync(timer.visible);
    },
    openExample: () => ExampleApp.open(),
  };
  // `api` is the Foundry convention for a public API, but isn't a typed field on Module.
  if (module) (module as { api?: ModuleApi }).api = api;
  console.log(`${MODULE_ID} | ready (v${version})`);
});
