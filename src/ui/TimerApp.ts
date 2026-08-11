import { mount, unmount } from 'svelte';
import { MODULE_ID } from '@/constants';
import { placement } from '@/timer/placement';
import TimerPanel from './components/flipclock/TimerPanel.svelte';

const { ApplicationV2 } = foundry.applications.api;

export class TimerApp extends ApplicationV2 {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-panel`,
    tag: 'section',
    classes: [MODULE_ID, `${MODULE_ID}-overlay`],
    // Unpositioned so AppV2 writes no inline left/top: CSS pins it top-centre, which
    // survives window resizes and the clock changing width.
    window: { frame: false, positioned: false },
  };

  static #instance?: TimerApp;
  #component?: ReturnType<typeof mount>;
  #root?: HTMLElement;
  #allowClose = false;

  /** Sole open/close path — driven by synced state, so no client can diverge. */
  static sync(visible: boolean): void {
    if (visible) {
      (TimerApp.#instance ??= new TimerApp()).render({ force: true });
    } else if (TimerApp.#instance) {
      const app = TimerApp.#instance;
      TimerApp.#instance = undefined;
      app.#allowClose = true;
      void app.close();
    }
  }

  // Swallows every close not initiated by sync() — Esc, macros, other modules.
  override close(options?: Parameters<InstanceType<typeof ApplicationV2>['close']>[0]): Promise<this> {
    if (!this.#allowClose) return Promise.resolve(this);
    return super.close(options) as Promise<this>;
  }

  // First render is the earliest the element is in the document — the panel itself is
  // mounted detached, so it cannot reach its own overlay.
  protected override async _onFirstRender(
    context: object,
    options: foundry.applications.ApplicationRenderOptions,
  ): Promise<void> {
    await super._onFirstRender(context, options);
    placement.attach(this.element);
  }

  // AppV2 runs _renderHTML on every render; mount once and reuse the node, so a
  // re-render neither leaks a second component (the first is never unmounted) nor
  // discards Svelte's reactive state. Svelte drives all updates from here.
  protected override async _renderHTML(): Promise<HTMLElement> {
    if (!this.#component) {
      this.#root = document.createElement('div');
      this.#component = mount(TimerPanel, { target: this.#root });
    }
    return this.#root!;
  }

  protected override _replaceHTML(result: HTMLElement, content: HTMLElement): void {
    content.replaceChildren(result);
  }

  protected override async _preClose(): Promise<void> {
    placement.detach();
    if (this.#component) {
      unmount(this.#component);
      this.#component = undefined;
      this.#root = undefined;
    }
  }
}
