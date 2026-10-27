<script lang="ts">
    import { onDestroy, onMount, createEventDispatcher } from "svelte";

    /** Tests passed in the accepted submission (shown under the title). */
    export let totalTests: number | null = null;
    export let runtimeMs: number | null = null;
    /** How long the celebration stays before it closes itself. */
    export let duration = 2200;

    const dispatch = createEventDispatcher<{ done: void }>();
    // Twelve particles, evenly spread around the mark, alternating size and color.
    const particles = Array.from({ length: 12 }, (_, i) => ({
        angle: (360 / 12) * i + (i % 2 ? 8 : -8),
        distance: i % 3 === 0 ? 92 : 74,
        delay: (i % 4) * 25,
        tone: i % 3,
    }));

    let leaving = false;
    let leaveTimer: ReturnType<typeof setTimeout>;
    let doneTimer: ReturnType<typeof setTimeout>;

    function close() {
        if (leaving) return;
        leaving = true;
        clearTimeout(leaveTimer);
        doneTimer = setTimeout(() => dispatch("done"), 260);
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === "Escape") close();
    }

    onMount(() => {
        leaveTimer = setTimeout(close, duration);
    });

    onDestroy(() => {
        clearTimeout(leaveTimer);
        clearTimeout(doneTimer);
    });
</script>

<svelte:window on:keydown={onKey} />

<!-- Click anywhere (or Escape, handled on the window) to close early. -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<div class="celebration" class:leaving on:click={close} role="status" aria-live="polite">
    <div class="card">
        <div class="mark">
            <span class="ring" aria-hidden="true"></span>
            <span class="ring second" aria-hidden="true"></span>
            {#each particles as p}
                <span
                    class="particle tone-{p.tone}"
                    style="--angle: {p.angle}deg; --distance: {p.distance}px; --delay: {p.delay}ms"
                    aria-hidden="true"
                ></span>
            {/each}
            <svg class="badge" viewBox="0 0 120 120" aria-hidden="true">
                <circle class="disc" cx="60" cy="60" r="52" />
                <path class="check" d="M37 62 L53 78 L84 44" />
            </svg>
        </div>
        <div class="title">Accepted</div>
        {#if totalTests != null || runtimeMs != null}
            <div class="detail">
                {#if totalTests != null}{totalTests} / {totalTests} tests passed{/if}
                {#if totalTests != null && runtimeMs != null}<span class="dot">·</span>{/if}
                {#if runtimeMs != null}{runtimeMs.toFixed(0)} ms{/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .celebration {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at center, rgba(34, 197, 94, 0.16), transparent 60%);
        animation: backdrop-in 220ms ease-out both;
        cursor: pointer;
    }
    .celebration.leaving {
        animation: backdrop-out 260ms ease-in both;
    }
    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 28px 40px 24px;
        border-radius: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(34, 197, 94, 0.15);
        animation: card-in 420ms cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
    }
    .leaving .card {
        animation: card-out 260ms ease-in both;
    }
    .mark {
        position: relative;
        width: 120px;
        height: 120px;
        display: grid;
        place-items: center;
    }
    .badge {
        width: 120px;
        height: 120px;
        position: relative;
        z-index: 2;
        overflow: visible;
    }
    .disc {
        fill: #22c55e;
        transform-origin: 60px 60px;
        animation: disc-pop 520ms cubic-bezier(0.2, 0.9, 0.3, 1.4) 60ms both;
        filter: drop-shadow(0 6px 14px rgba(22, 163, 74, 0.45));
    }
    .check {
        fill: none;
        stroke: #fff;
        stroke-width: 10;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 80;
        stroke-dashoffset: 80;
        animation: draw 380ms cubic-bezier(0.65, 0, 0.35, 1) 420ms forwards;
    }
    .ring {
        position: absolute;
        inset: 8px;
        border-radius: 50%;
        border: 3px solid #22c55e;
        opacity: 0;
        animation: ring 900ms ease-out 260ms both;
    }
    .ring.second {
        animation-delay: 480ms;
        border-color: #4ade80;
    }
    .particle {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        opacity: 0;
        animation: burst 760ms cubic-bezier(0.15, 0.8, 0.3, 1) calc(380ms + var(--delay)) both;
    }
    .particle.tone-0 { background: #22c55e; }
    .particle.tone-1 { background: #86efac; width: 6px; height: 6px; margin: -3px 0 0 -3px; }
    .particle.tone-2 { background: #facc15; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; }
    .title {
        margin-top: 8px;
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        color: var(--color-correct);
        animation: rise 360ms ease-out 560ms both;
    }
    .detail {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
        animation: rise 360ms ease-out 660ms both;
    }
    .dot {
        margin: 0 6px;
    }

    @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes backdrop-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes card-in {
        from { opacity: 0; transform: translateY(12px) scale(0.92); }
        to { opacity: 1; transform: none; }
    }
    @keyframes card-out {
        from { opacity: 1; transform: none; }
        to { opacity: 0; transform: translateY(-8px) scale(0.96); }
    }
    @keyframes disc-pop {
        0% { transform: scale(0); }
        70% { transform: scale(1.08); }
        100% { transform: scale(1); }
    }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes ring {
        0% { opacity: 0.7; transform: scale(0.85); }
        100% { opacity: 0; transform: scale(1.6); }
    }
    @keyframes burst {
        0% { opacity: 0; transform: rotate(var(--angle)) translateX(0) scale(0.4); }
        20% { opacity: 1; }
        100% { opacity: 0; transform: rotate(var(--angle)) translateX(var(--distance)) scale(1); }
    }
    @keyframes rise {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: none; }
    }

    @media (prefers-reduced-motion: reduce) {
        .card, .disc, .title, .detail { animation: backdrop-in 200ms ease-out both; }
        .check { animation: none; stroke-dashoffset: 0; }
        .ring, .particle { display: none; }
    }
</style>
