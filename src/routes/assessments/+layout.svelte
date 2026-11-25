<script lang="ts">
	import { base } from '$app/paths';
	let { children } = $props();
</script>

<main class="assessment">
	<nav aria-label="Assessment navigation">
		<a href={`${base}/`}>Cojudge</a>
		<a href={`${base}/assessments`}>Assessments</a>
	</nav>
	{@render children()}
</main>

<style>
	.assessment { max-width: 80rem; margin-inline: auto; padding: clamp(1rem, 3vw, 3rem); color: var(--color-text); font-family: var(--font-sans); }
	nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
	nav a { color: inherit; padding-block: .5rem; text-underline-offset: .25rem; }
</style>
