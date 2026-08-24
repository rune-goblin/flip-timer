<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import type { TransitionConfig } from 'svelte/transition';
  import { MAX_SPLITS, MAX_TIMER_MINUTES, MODULE_ID, SETTING_COMPACT } from '@/constants';
  import { placement } from '@/timer/placement';
  import { timer } from '@/timer/store.svelte';
  import FlipClock from './FlipClock.svelte';
  import {
    adjustClockDigit,
    adjustHourDigit,
    clockHours,
    clockMinutes,
    CLOCK_PLACES,
    formatClock,
    HOUR_PLACES,
    type ClockPlace,
  } from './format';

  const isGM = game.user.isGM;

  let shown = $state(timer.running ? Math.max(Math.ceil((timer.endAt - Date.now()) / 1000), 0) : timer.remaining);

  // Each client ticks locally against the shared epoch deadline; only the GM's
  // finish() lands, players just clamp at zero until the sync arrives.
  $effect(() => {
    if (!timer.running) {
      shown = timer.remaining;
      return;
    }
    const endAt = timer.endAt;
    const tick = () => {
      const left = Math.ceil((endAt - Date.now()) / 1000);
      shown = Math.max(left, 0);
      if (left <= 0) timer.finish();
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  });

  let display = $derived(clockMinutes(shown));
  let hours = $derived(clockHours(shown));
  let urgent = $derived(shown > 0 && shown <= 10);
  let done = $derived(shown === 0);
  let blink = $derived(urgent && timer.running);

  // Seeds from the synced value; the input then belongs to the GM until applied.
  let minutes = $state(Math.max(Math.round(timer.duration / 60), 1));

  const i18n = (key: string) => game.i18n.localize(`${MODULE_ID}.timer.${key}`);

  // Adjusting off the displayed value, not the stored one, so a running clock is
  // overridden from the second the GM actually sees.
  const adjust = (index: number, delta: number) => timer.setRemaining(adjustClockDigit(shown, index, delta));
  const adjustHours = (index: number, delta: number) => timer.setRemaining(adjustHourDigit(shown, index, delta));

  const labelFor = (places: Record<number, ClockPlace>) => (index: number, delta: number) =>
    game.i18n.format(`${MODULE_ID}.timer.${delta > 0 ? 'adjustUp' : 'adjustDown'}`, {
      place: i18n(`places.${places[index]?.name}`),
    });

  const adjustLabel = labelFor(CLOCK_PLACES);
  const hourLabel = labelFor(HOUR_PLACES);

  // Width alongside opacity, so the minutes columns slide over as the hours column
  // arrives and leaves instead of jumping a column's width sideways.
  function unroll(node: HTMLElement): TransitionConfig {
    // Measured off the inner box, which holds its natural width while the outer one
    // animates — so a fade interrupted mid-flight still resolves to the full width.
    const width = (node.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
    return {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420,
      easing: cubicOut,
      css: (t) => `opacity: ${t}; width: ${t * width}px`,
    };
  }

  let compact = $state(game.settings.get(MODULE_ID, SETTING_COMPACT) === true);

  function toggleSize() {
    placement.pin();
    compact = !compact;
    void game.settings.set(MODULE_ID, SETTING_COMPACT, compact);
  }

  // A panel parked against an edge can outgrow the viewport when it enlarges.
  $effect(() => {
    void compact;
    placement.refit();
  });

</script>

<div class={['timer-panel', { compact }]}>
  <div class="tools">
    <button
      type="button"
      aria-label={i18n('move')}
      title={i18n('move')}
      onpointerdown={placement.start}
      onpointermove={placement.move}
      onpointerup={placement.end}
      onpointercancel={placement.end}
    >
      <i class="fa-solid fa-up-down-left-right"></i>
    </button>
    <button type="button" aria-label={i18n(compact ? 'enlarge' : 'shrink')} title={i18n(compact ? 'enlarge' : 'shrink')} onclick={toggleSize}>
      <i class={['fa-solid', compact ? 'fa-up-right-and-down-left-from-center' : 'fa-down-left-and-up-right-to-center']}></i>
    </button>
  </div>
  <div class="clock-row">
    <div class={['clock', { urgent, done, running: timer.running }]} class:blink-a={blink && shown % 2 === 1} class:blink-b={blink && shown % 2 === 0}>
      <div class="face" role="timer">
        <!-- Only above the hour: below it the column is absent, not zero. -->
        {#if hours}
          <div class="hours" transition:unroll>
            <div class="hours-inner">
              <FlipClock text={`${hours}:`} onadjust={isGM ? adjustHours : undefined} adjustLabel={isGM ? hourLabel : undefined} />
            </div>
          </div>
        {/if}
        <FlipClock text={display} onadjust={isGM ? adjust : undefined} adjustLabel={isGM ? adjustLabel : undefined} />
      </div>
    </div>
    {#if timer.splits.length}
      <!-- Absolute so the main clock keeps its place as splits come and go. -->
      <div class="splits">
        <!-- Keyed by position: a row's identity IS its slot in the column, so a split
             removed above it slides its neighbours up and the digits flip to suit. -->
        {#each timer.splits as seconds, i (i)}
          <div class="split">
            <div class="clock">
              <FlipClock text={formatClock(seconds)} flat />
            </div>
            {#if isGM}
              <div class="split-controls">
                <button type="button" aria-label={i18n('swap')} title={i18n('swap')} onclick={() => timer.swapSplit(i)}>⇄</button>
                <button type="button" aria-label={i18n('merge')} title={i18n('merge')} onclick={() => timer.mergeSplit(i)}>✕</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  {#if isGM}
    <div class="controls">
      <label>
        {i18n('minutes')}
        <input type="number" min="1" max={MAX_TIMER_MINUTES} bind:value={minutes} onchange={() => timer.setDurationMinutes(minutes)} />
      </label>
      <button
        type="button"
        class="icon"
        aria-label={i18n(timer.running ? 'pause' : 'start')}
        title={i18n(timer.running ? 'pause' : 'start')}
        onclick={() => (timer.running ? timer.pause() : timer.start())}
        disabled={!timer.running && shown === 0}
      >
        <i class={['fa-solid', timer.running ? 'fa-pause' : 'fa-play']}></i>
      </button>
      <button type="button" onclick={() => timer.reset()}>
        {i18n('reset')}
      </button>
      <button type="button" onclick={() => timer.splitOff()} disabled={timer.splits.length >= MAX_SPLITS}>
        {i18n('split')}
      </button>
    </div>
  {/if}
</div>

<style>
  .timer-panel {
    --fc-size: 96px;
    position: relative;
    display: flex;
    flex-direction: column;
    /* Left-aligned, not centred: the drag handle hangs off this edge, so every row
       has to keep it as the fixed point when the clock changes size. */
    align-items: start;
    gap: 0.6rem;
  }
  .timer-panel.compact {
    --fc-size: 48px;
  }
  /* Splits hang off the clock's own box rather than the panel's, which the wider
     controls row would otherwise stretch away from it. */
  .clock-row {
    position: relative;
  }
  .clock {
    --fc-h: var(--fc-size);
  }
  .face {
    display: flex;
    align-items: center;
  }
  /* Clipped so the column unrolls out of nothing; the inner box keeps its natural
     width, which is what the transition measures. The padding gives the cards' drop
     shadow room inside the clip, and the negative margin hands that room back to the
     row so the hours sit level with the minutes. */
  .hours {
    overflow: hidden;
    margin-block: calc(var(--fc-h, 96px) * -0.1);
  }
  .hours-inner {
    width: max-content;
    padding-block: calc(var(--fc-h, 96px) * 0.1);
    /* Stands in for the gap .face gives up, so the spacing collapses with the column. */
    padding-right: calc(var(--fc-h, 96px) * 0.08);
  }
  .clock.urgent {
    --fc-ink: #ff4545;
    --fc-pulse: #ff4545;
  }
  /* One pulse per flip, not a free-running blink: full opacity lands on the flap's
     impact — 55% of FlipDigit's 480ms fc-flip, so 264ms into the second — then decays
     until the next flip begins. Two identical animations alternated by second parity,
     because reassigning the same name never replays. */
  .clock.blink-a {
    animation: fc-blink-a 1s both;
  }
  .clock.blink-b {
    animation: fc-blink-b 1s both;
  }
  /* --fc-pulse here too: the final flip to zero lands after urgent has yielded to
     done, and its pulse should still fire. */
  .clock.done {
    --fc-ink: #ff4545;
    --fc-pulse: #ff4545;
    animation: fc-done-pulse 1.2s ease-in-out infinite;
  }
  .splits {
    position: absolute;
    top: 0;
    left: 100%;
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 0.35rem;
    /* Padding, not margin: it keeps the column's box flush against the panel so the
       pointer never crosses a dead gap on its way to the split buttons. */
    padding-left: 0.75rem;
  }
  .split {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .split .clock {
    --fc-h: calc(var(--fc-size) * 0.3);
    --fc-gap: 0px;
    opacity: 0.5;
  }
  .split-controls {
    display: flex;
    gap: 0.35rem;
  }
  .tools {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 5;
    /* Clear of the panel's left edge by the same gap the split buttons keep, top flush
       with the clock. */
    transform: translateX(calc(-100% - 0.7rem));
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .tools button {
    width: 1.4rem;
    height: 1.4rem;
    min-width: 0;
    padding: 0;
    line-height: 1;
    font-size: 0.7rem;
    flex: 0 0 auto;
    box-shadow: none;
    /* Or the browser pans the page instead of sending us pointermove on touch. */
    touch-action: none;
  }
  .tools button:hover,
  .tools button:focus,
  .tools button:focus-visible,
  .tools button:active {
    box-shadow: none;
  }
  .tools button:first-child {
    cursor: grab;
  }
  .tools button:first-child:active {
    cursor: grabbing;
  }

  /* The chrome is hidden until the pointer is somewhere over the panel; opacity, not
     display, so the hitbox and the clock's position never move. */
  .tools,
  .controls,
  .split-controls {
    opacity: 0;
    transition: opacity 500ms ease;
  }
  .timer-panel:hover .tools,
  .timer-panel:focus-within .tools,
  .timer-panel:hover .controls,
  .timer-panel:focus-within .controls,
  .timer-panel:hover .split-controls,
  .timer-panel:focus-within .split-controls {
    opacity: 1;
    transition-duration: 250ms;
  }
  .split-controls button {
    width: 1.2rem;
    height: 1.2rem;
    padding: 0;
    line-height: 1;
    font-size: 0.7rem;
    flex: 0 0 auto;
    box-shadow: none;
    opacity: 0.5;
    transition: opacity 120ms ease;
  }
  /* Foundry's own hover accent stays; only its glow goes — over the canvas the
     shadow smears into a murky edge. */
  .split-controls button:hover,
  .split-controls button:focus,
  .split-controls button:focus-visible,
  .split-controls button:active {
    box-shadow: none;
    opacity: 1;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    background: rgba(10, 10, 14, 0.75);
    color: #ddd;
  }
  .controls label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
  }
  .controls input {
    width: 4rem;
    text-align: center;
  }
  .controls button {
    min-width: 5rem;
  }
  .controls button.icon {
    min-width: 0;
    width: 2rem;
    padding: 0;
    flex: 0 0 auto;
  }
  /* ease-in on the rise mirrors the flap's gravity fall, so brightness accelerates
     into the impact just as the card does. */
  @keyframes fc-blink-a {
    0% {
      opacity: 0.75;
      animation-timing-function: ease-in;
    }
    26.4% {
      opacity: 1;
      animation-timing-function: ease-out;
    }
    100% {
      opacity: 0.75;
    }
  }
  @keyframes fc-blink-b {
    0% {
      opacity: 0.75;
      animation-timing-function: ease-in;
    }
    26.4% {
      opacity: 1;
      animation-timing-function: ease-out;
    }
    100% {
      opacity: 0.75;
    }
  }
  @keyframes fc-done-pulse {
    0%,
    100% {
      filter: none;
    }
    50% {
      filter: brightness(1.6) drop-shadow(0 0 10px #ff4545);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .clock.blink-a,
    .clock.blink-b,
    .clock.done {
      animation: none;
    }
  }
</style>
