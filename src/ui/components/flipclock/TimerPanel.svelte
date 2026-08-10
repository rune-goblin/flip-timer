<script lang="ts">
  import { MODULE_ID } from '@/constants';
  import { timer } from '@/timer/store.svelte';
  import FlipClock from './FlipClock.svelte';
  import { formatClock } from './format';

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

  let display = $derived(formatClock(shown));
  let urgent = $derived(shown > 0 && shown <= 10);
  let done = $derived(shown === 0);

  // Seeds from the synced value; the input then belongs to the GM until applied.
  let minutes = $state(Math.max(Math.round(timer.duration / 60), 1));

  const i18n = (key: string) => game.i18n.localize(`${MODULE_ID}.timer.${key}`);
</script>

<div class="timer-panel">
  <div class={['clock', { urgent, done, running: timer.running }]}>
    <FlipClock text={display} />
  </div>
  {#if isGM}
    <div class="controls">
      <label>
        {i18n('minutes')}
        <input type="number" min="1" max="99" bind:value={minutes} onchange={() => timer.setDurationMinutes(minutes)} />
      </label>
      <button type="button" onclick={() => (timer.running ? timer.pause() : timer.start())} disabled={!timer.running && shown === 0}>
        {timer.running ? i18n('pause') : i18n('start')}
      </button>
      <button type="button" onclick={() => timer.reset()}>
        {i18n('reset')}
      </button>
    </div>
  {/if}
</div>

<style>
  .timer-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }
  .clock.urgent {
    --fc-ink: #ff4545;
  }
  .clock.urgent.running {
    animation: fc-blink 1s ease-in-out infinite;
  }
  .clock.done {
    --fc-ink: #ff4545;
    animation: fc-done-pulse 1.2s ease-in-out infinite;
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
  @keyframes fc-blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
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
    .clock.urgent.running,
    .clock.done {
      animation: none;
    }
  }
</style>
