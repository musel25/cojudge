<script lang="ts">
    import { buildLearningPath, type LearningPathCourse } from '$lib/learningPath';

    export let courses: LearningPathCourse[] = [];
    export let solved: Record<string, boolean> = {};
    export let selectedCourseId: string | null = null;
    export let pendingCourseId: string | null = null;
    export let onSelect: (id: string) => void;

    $: path = buildLearningPath(courses, solved);
</script>

<section id="learning-path-panel" class="learning-path" aria-labelledby="learning-path-title">
    <div class="path-heading">
        <div>
            <h2 id="learning-path-title">Your Python learning path</h2>
            <p>Follow the courses in this order. Open any step to practice.</p>
        </div>
        {#if path.next}
            <a class="continue" href={`/?course=${encodeURIComponent(path.next.id)}`}
                onclick={() => path.next && onSelect(path.next.id)}
                aria-label={`Continue with ${path.next.title}`}>
                <span>Continue <span aria-hidden="true">→</span></span>
                <small>{path.next.title}</small>
            </a>
        {:else if path.total > 0}
            <span class="path-finished">{path.unavailable ? 'All available courses complete' : 'Learning path complete'}</span>
        {/if}
    </div>

    <div class="path-progress">
        <span>{path.done} / {path.total} exercises complete</span>
        <progress max={path.total || 1} value={path.done} aria-label="Learning path progress"></progress>
    </div>

    <div class="phases">
        {#each path.phases as phase, index}
            <section class="phase" aria-labelledby={`path-phase-${index}`}>
                <div class="phase-heading">
                    <span class="phase-number" aria-hidden="true">0{index + 1}</span>
                    <div>
                        <span class="phase-name">{phase.name}</span>
                        <h3 id={`path-phase-${index}`}>{phase.title}</h3>
                    </div>
                </div>
                <p class="phase-description">{phase.description}</p>
                <ol start={phase.steps[0].number}>
                    {#each phase.steps as step}
                        <li class:complete={step.complete} class:current={step.id === selectedCourseId}
                            class:unavailable={!step.available}>
                            <span class="step-number" aria-hidden="true">{step.complete ? '✓' : step.number}</span>
                            {#if step.available}
                                <a class="step-link" href={`/?course=${encodeURIComponent(step.id)}`}
                                    aria-current={step.id === selectedCourseId ? 'page' : undefined}
                                    aria-busy={step.id === pendingCourseId || undefined}
                                    onclick={() => onSelect(step.id)}>
                                    <span class="step-title">{step.title}</span>
                                    <span class="step-detail">
                                        {step.id === pendingCourseId ? 'Loading…' : step.complete ? 'Complete' : `${step.done} / ${step.total} complete`}
                                        {#if step.id === path.next?.id}<span class="next-label">Up next</span>{/if}
                                    </span>
                                </a>
                                <span class="step-arrow" aria-hidden="true">→</span>
                            {:else}
                                <div class="step-link">
                                    <span class="step-title">{step.title}</span>
                                    <span class="step-detail">Not available</span>
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ol>
            </section>
        {/each}
    </div>
    {#if path.unavailable > 0}
        <p class="availability-note">Unavailable courses stay in the plan. Continue skips them until they are added.</p>
    {/if}
</section>

<style>
    .learning-path {
        margin: 1rem 0 1.5rem;
        padding: 1.5rem;
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-lg);
        background: var(--color-surface);
        color: var(--color-text);
    }
    .path-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    h2 { margin: 0; font-size: 1.25rem; font-weight: 650; letter-spacing: -0.025em; }
    p { color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.5; }
    .path-heading p { margin: 0.4rem 0 0; }
    .continue {
        display: flex; flex-direction: column; gap: 0.2rem;
        flex-shrink: 0; max-width: 45%; padding: 0.65rem 1rem;
        border-radius: 8px; background: var(--color-primary); color: var(--color-primary-text);
        text-decoration: none; font-size: 0.9rem; font-weight: 650;
    }
    .continue > span { display: flex; justify-content: space-between; gap: 1.5rem; }
    .continue small { font-size: 0.72rem; font-weight: 500; }
    .continue:hover { filter: brightness(1.06); }
    a:focus-visible { outline: 2px solid var(--color-highlight); outline-offset: 3px; }
    .path-progress { display: flex; align-items: center; gap: 1rem; margin: 1.3rem 0 1.6rem; }
    .path-progress span { flex-shrink: 0; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-text-secondary); }
    progress { display: block; width: 100%; height: 5px; border: none; border-radius: 4px; overflow: hidden; background: var(--color-border); accent-color: var(--color-primary); }
    progress::-webkit-progress-bar { background: var(--color-border); }
    progress::-webkit-progress-value { background: var(--color-primary); }
    progress::-moz-progress-bar { background: var(--color-primary); }
    .phases { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
    .phase-heading { display: flex; align-items: center; gap: 0.8rem; }
    .phase-number { font-family: var(--font-mono); font-size: 1.9rem; letter-spacing: -0.06em; color: var(--color-text-secondary); }
    .phase-name { font-size: 0.73rem; color: var(--color-text-secondary); }
    h3 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 650; }
    .phase-description { margin: 0.65rem 0 0.9rem; min-height: 2.55rem; }
    ol { list-style: none; padding: 0; margin: 0; }
    li { position: relative; display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.6rem; border-radius: 8px; }
    li + li { margin-top: 0.15rem; }
    li:has(a):hover { background: var(--color-surface-hover); }
    li.current { background: var(--color-surface-hover); box-shadow: inset 2px 0 var(--color-highlight); }
    .step-number { display: grid; place-items: center; flex: 0 0 1.6rem; height: 1.6rem; border: 1px solid var(--color-border); border-radius: 50%; font-family: var(--font-mono); font-size: 0.73rem; color: var(--color-text-secondary); }
    .complete .step-number { color: var(--color-correct); border-color: var(--color-correct); }
    .step-link { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 0.3rem; color: inherit; text-decoration: none; }
    a.step-link::after { content: ''; position: absolute; inset: 0; border-radius: 8px; }
    .step-title { font-size: 0.87rem; font-weight: 550; overflow-wrap: anywhere; }
    .step-detail { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; font-size: 0.72rem; color: var(--color-text-secondary); }
    .next-label { color: var(--color-text); font-weight: 600; }
    .step-arrow { color: var(--color-text-secondary); }
    .unavailable .step-number { border-style: dashed; }
    .unavailable .step-title { color: var(--color-text-secondary); }
    .path-finished { font-size: 0.85rem; color: var(--color-correct); }
    .availability-note { margin: 1.2rem 0 0; padding-top: 1rem; border-top: 1px solid var(--color-border); font-size: 0.75rem; }
    @media (max-width: 640px) {
        .learning-path { padding: 1.1rem; }
        .path-heading { align-items: flex-start; flex-direction: column; }
        .continue { max-width: 100%; align-self: stretch; }
        .path-progress { flex-direction: column; align-items: stretch; gap: 0.6rem; }
        .phases { grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
        .phase + .phase { border-top: 1px solid var(--color-border); padding-top: 1.4rem; }
        .phase-description { min-height: 0; }
    }
</style>
