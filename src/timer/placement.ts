import { MODULE_ID } from '@/constants';

export const SETTING_POSITION = 'position';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Breathing room around the panel, wide enough that the handle overhanging its left
 *  edge stays on screen and grabbable. */
const MARGIN = 40;

/** A window resized smaller between sessions would otherwise strand a stored
 *  position off-screen, taking the handle with it. */
export function clampPosition(pos: PanelPosition, size: Size, viewport: Size): PanelPosition {
  const limit = (value: number, extent: number, available: number) =>
    Math.min(Math.max(value, MARGIN), Math.max(available - extent - MARGIN, MARGIN));
  return {
    x: limit(pos.x, size.width, viewport.width),
    y: limit(pos.y, size.height, viewport.height),
  };
}

/** Anything but a finite pair means "unplaced" — fall back to the CSS default. */
export function readPosition(stored: unknown): PanelPosition | null {
  const { x, y } = (stored ?? {}) as Partial<PanelPosition>;
  return Number.isFinite(x) && Number.isFinite(y) ? { x: x as number, y: y as number } : null;
}

// Positions the overlay AppV2 owns, which is the panel's ancestor rather than part of
// its template — so the app hands the element over on first render and the drag handle
// only wires pointer events to the methods here. Client-scoped setting: every user
// parks the timer where it suits their screen.
class PanelPlacement {
  #el?: HTMLElement;
  #pos: PanelPosition | null = null;
  #grab: { dx: number; dy: number } | null = null;

  attach(el: HTMLElement): void {
    this.#el = el;
    this.#place(this.#fit(readPosition(game.settings.get(MODULE_ID, SETTING_POSITION))));
    window.addEventListener('resize', this.refit);
  }

  detach(): void {
    window.removeEventListener('resize', this.refit);
    this.#el = undefined;
    this.#grab = null;
  }

  start = (event: PointerEvent): void => {
    if (!this.#el) return;
    const rect = this.#el.getBoundingClientRect();
    this.#grab = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    // Capture on the handle so the panel keeps following a pointer that outruns it.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  move = (event: PointerEvent): void => {
    if (!this.#grab) return;
    this.#place(this.#fit({ x: event.clientX - this.#grab.dx, y: event.clientY - this.#grab.dy }));
  };

  end = (event: PointerEvent): void => {
    if (!this.#grab) return;
    this.#grab = null;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    void game.settings.set(MODULE_ID, SETTING_POSITION, this.#pos ?? {});
  };

  /** Freeze where the panel sits before it changes size. Until the first drag the
   *  stylesheet centres it, so a resize would slide it out from under the handle. */
  pin = (): void => {
    if (this.#pos || !this.#el) return;
    const rect = this.#el.getBoundingClientRect();
    this.#place({ x: rect.left, y: rect.top });
  };

  /** Re-clamp after the panel itself changes size. */
  refit = (): void => this.#place(this.#fit(this.#pos));

  #fit(pos: PanelPosition | null): PanelPosition | null {
    if (!pos || !this.#el) return pos;
    const rect = this.#el.getBoundingClientRect();
    return clampPosition(pos, rect, { width: window.innerWidth, height: window.innerHeight });
  }

  /** Unplaced falls back to the stylesheet's top-centre pin. */
  #place(pos: PanelPosition | null): void {
    this.#pos = pos;
    const el = this.#el;
    if (!el) return;
    el.style.left = pos ? `${pos.x}px` : '';
    el.style.top = pos ? `${pos.y}px` : '';
    el.style.transform = pos ? 'none' : '';
  }
}

export const placement = new PanelPlacement();
