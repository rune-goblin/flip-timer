<script lang="ts">
  import FlipDigit from './FlipDigit.svelte';

  let {
    text,
    flat = false,
    onadjust,
    adjustLabel,
  }: {
    text: string;
    flat?: boolean;
    onadjust?: (index: number, delta: number) => void;
    adjustLabel?: (index: number, delta: number) => string;
  } = $props();
</script>

<!-- No role: the caller owns it — the face is two of these side by side once the
     hours column is up, and that is one timer, not two.
     Keyed by position on purpose: a column's identity IS its position, so each
     FlipDigit persists in place and animates when its character changes. -->
<div class="flipclock">
  {#each text as ch, i (i)}
    {#if ch >= '0' && ch <= '9'}
      <FlipDigit
        value={ch}
        {flat}
        onadjust={onadjust && ((delta) => onadjust(i, delta))}
        labelUp={adjustLabel?.(i, 1)}
        labelDown={adjustLabel?.(i, -1)}
      />
    {:else}
      <div class="sep" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    {/if}
  {/each}
</div>

<style>
  .flipclock {
    display: flex;
    align-items: center;
    gap: var(--fc-gap, calc(var(--fc-h, 96px) * 0.08));
  }
  .sep {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(var(--fc-h, 96px) * 0.22);
    height: var(--fc-h, 96px);
    padding: 0 calc(var(--fc-h, 96px) * 0.02);
  }
  .sep span {
    width: calc(var(--fc-h, 96px) * 0.09);
    height: calc(var(--fc-h, 96px) * 0.09);
    border-radius: 50%;
    background: var(--fc-ink, #f2efe6);
    opacity: 0.85;
  }
</style>
