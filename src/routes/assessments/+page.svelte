<script lang="ts">
	import { base } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Python assessments | Cojudge</title></svelte:head>

<h1>Python assessments</h1>
<p>Build one implementation across four levels. Choose timed assessment or unlimited learning.</p>
<ul>
	{#each data.assessments as assessment (assessment.id)}
		<li>
			<h2>
				{#if assessment.invalid}
					{assessment.title}
				{:else}
					<a href={`${base}/assessments/${assessment.id}`}>{assessment.title}</a>
				{/if}
			</h2>
			<p>{assessment.summary}</p>
		</li>
	{:else}
		<li>No assessment packs are available.</li>
	{/each}
</ul>

<style>
	ul { max-width: 50rem; padding: 0; list-style: none; display: grid; gap: 1rem; margin-top: 1.5rem; }
	li { padding: 1.25rem; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--border-radius-sm); }
	h2 { font-size: 1.25rem; margin: 0 0 .5rem; }
	p { line-height: 1.5; }
	li p { margin: 0; color: var(--color-text-secondary); }
	a { color: inherit; text-underline-offset: .25rem; }
</style>
