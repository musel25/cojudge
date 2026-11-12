<script lang="ts">
    import type { TestCasePresentation } from '$lib/utils/testCasePresentation';
    export let detail: TestCasePresentation;
</script>

<section class="test-case-details" aria-label="Test details">
    <p>{detail.title}</p>
    <pre><code>{detail.code}</code></pre>
</section>

<style>
    p { margin: 0 0 var(--spacing-2); color: var(--color-text-secondary); font-size: 0.9rem; }
    pre { margin: 0; padding: var(--spacing-2); overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: var(--border-radius); background: var(--color-bg); color: var(--color-text); font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.5; }
</style>
