export const MODULE_ID = 'flip-timer';

/** 99:59:59 — the largest countdown the clock face can show once it grows an
 *  hours column. */
export const MAX_TIMER_SECONDS = 99 * 3600 + 59 * 60 + 59;

/** Above this the face grows an hours column. */
export const HOUR_SECONDS = 3600;

/** The face carries at most two hour digits, so this is the longest countdown a
 *  GM can dial in through the minutes field. */
export const MAX_TIMER_MINUTES = Math.floor(MAX_TIMER_SECONDS / 60);

export const MAX_SPLITS = 3;

/** Client-scoped: half-size clock face. */
export const SETTING_COMPACT = 'compact';
