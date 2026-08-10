<script lang="ts">
  import { MODULE_ID } from '@/constants';

  let { value }: { value: string } = $props();

  // The initial prop value seeds the display; from then on the flip state machine
  // owns these and follows `value` one animation at a time.
  // svelte-ignore state_referenced_locally
  let current = $state(value);
  // svelte-ignore state_referenced_locally
  let next = $state(value);
  let flipping = $state(false);

  // Values arriving mid-flip wait for animationend; the effect re-runs on settle
  // (it reads `flipping`) and starts the next flip, skipping intermediate values.
  $effect(() => {
    if (!flipping && value !== current) {
      next = value;
      flipping = true;
    }
  });

  function settle() {
    current = next;
    flipping = false;
  }

  // Digit art is served by Foundry at the module path (never imported — see CLAUDE.md);
  // masking with it lets CSS color the glyph.
  const glyphUrl = (d: string) => `url("modules/${MODULE_ID}/assets/digits/${d}.svg")`;
</script>

{#snippet pane(d: string, half: 'top' | 'bottom')}
  <div class={['pane', `pane-${half}`]}>
    <span class="glyph" style:mask-image={glyphUrl(d)}></span>
  </div>
{/snippet}

<div class="digit">
  <div class="half top">
    {@render pane(flipping ? next : current, 'top')}
  </div>
  <div class="half bottom">
    {@render pane(current, 'bottom')}
  </div>
  {#if flipping}
    <div class="flap" onanimationend={settle}>
      <div class="face front">
        {@render pane(current, 'top')}
      </div>
      <div class="face back">
        {@render pane(next, 'bottom')}
      </div>
    </div>
  {/if}
  <div class="hinge"></div>
</div>

<style>
  .digit {
    --fc-r: calc(var(--fc-h, 96px) * 0.07);
    position: relative;
    height: var(--fc-h, 96px);
    aspect-ratio: 3 / 4;
    perspective: calc(var(--fc-h, 96px) * 2.4);
    filter: drop-shadow(0 calc(var(--fc-h, 96px) * 0.03) calc(var(--fc-h, 96px) * 0.06) rgba(0, 0, 0, 0.45));
  }

  .half {
    position: absolute;
    left: 0;
    width: 100%;
    height: 50%;
    overflow: hidden;
  }
  .half.top {
    top: 0;
    border-radius: var(--fc-r) var(--fc-r) 0 0;
  }
  .half.bottom {
    bottom: 0;
    border-radius: 0 0 var(--fc-r) var(--fc-r);
  }

  /* Each pane is the full card; its half-height parent clips it to one half. */
  .pane {
    position: absolute;
    left: 0;
    width: 100%;
    height: 200%;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--fc-card, #1c1c22) 88%, white) 0%,
      var(--fc-card, #1c1c22) 42%,
      color-mix(in srgb, var(--fc-card, #1c1c22) 92%, black) 100%
    );
  }
  .pane-top {
    top: 0;
  }
  .pane-bottom {
    bottom: 0;
  }

  .glyph {
    position: absolute;
    inset: 9% 8%;
    background: var(--fc-ink, #f2efe6);
    mask-position: center;
    mask-size: contain;
    mask-repeat: no-repeat;
  }

  .flap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50%;
    z-index: 2;
    transform-origin: bottom;
    transform-style: preserve-3d;
    animation: fc-flip 480ms both;
  }
  .face {
    position: absolute;
    inset: 0;
    overflow: hidden;
    backface-visibility: hidden;
  }
  .face.front {
    border-radius: var(--fc-r) var(--fc-r) 0 0;
  }
  /* Pre-flipped so it reads upright once the flap has fallen; it then occupies the
     bottom half, hence bottom-half rounding and a bottom-aligned pane. */
  .face.back {
    transform: rotateX(180deg);
    border-radius: 0 0 var(--fc-r) var(--fc-r);
  }
  .face::after {
    content: '';
    position: absolute;
    inset: 0;
    background: #000;
    pointer-events: none;
  }
  .face.front::after {
    animation: fc-shade-front 480ms both;
  }
  .face.back::after {
    animation: fc-shade-back 480ms both;
  }

  .hinge {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: max(2px, calc(var(--fc-h, 96px) * 0.018));
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.55);
    z-index: 3;
  }

  /* Gravity fall, then a small rebound off the stop. */
  @keyframes fc-flip {
    0% {
      transform: rotateX(0deg);
      animation-timing-function: ease-in;
    }
    55% {
      transform: rotateX(-180deg);
      animation-timing-function: ease-out;
    }
    72% {
      transform: rotateX(-167deg);
      animation-timing-function: ease-in;
    }
    100% {
      transform: rotateX(-180deg);
    }
  }
  @keyframes fc-shade-front {
    0% {
      opacity: 0;
    }
    55%,
    100% {
      opacity: 0.4;
    }
  }
  @keyframes fc-shade-back {
    0% {
      opacity: 0.5;
    }
    100% {
      opacity: 0;
    }
  }

  /* animationend must still fire or the digit never settles, so shorten, not remove. */
  @media (prefers-reduced-motion: reduce) {
    .flap,
    .face::after {
      animation-duration: 1ms;
    }
  }
</style>
