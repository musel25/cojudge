<script lang="ts">
	import { enhance } from '$app/forms';

	let { heading, intro, exercise, attemptId, level, profile, questions, feedback, button }: {
		heading: string;
		intro: string;
		exercise: string;
		attemptId: string;
		level: number;
		profile: string;
		questions: { prompt: string; choices: string[] }[];
		feedback: { correct: boolean; answer: string }[] | undefined;
		button: string;
	} = $props();

	let checking = $state(false);
</script>

<section aria-labelledby={`practice-${exercise}`}>
	<h2 id={`practice-${exercise}`}>{heading}</h2>
	<p>{intro}</p>
	<form aria-labelledby={`practice-${exercise}`} method="POST" action={`?/practice&attempt=${attemptId}`}
		use:enhance={({ cancel }) => {
			if (checking) { cancel(); return; }
			checking = true;
			return async ({ update }) => {
				try { await update({ reset: false }); }
				finally { checking = false; }
			};
		}}>
		<input type="hidden" name="id" value={attemptId} />
		<input type="hidden" name="level" value={level} />
		<input type="hidden" name="profile" value={profile} />
		<input type="hidden" name="exercise" value={exercise} />

		{#each questions as question, index (`${exercise}:${level}:${index}`)}
			<fieldset>
				<legend>{question.prompt}</legend>
				{#each question.choices as choice, option}
					<label>
						<input type="radio" name={`answer-${index}`} value={option} required />
						{choice}
					</label>
				{/each}
				{#if feedback?.[index]}
					<p class="result">{feedback[index].correct ? 'Correct' : `Correct answer: ${feedback[index].answer}`}</p>
				{/if}
			</fieldset>
		{/each}
		<button type="submit" disabled={checking}>{button}</button>
		<div role="status">
			{#if checking}<p>Checking…</p>{/if}
			{#if feedback}<p>{feedback.filter((answer) => answer.correct).length} of {feedback.length} correct</p>{/if}
		</div>
	</form>
</section>

<style>
	section { margin-top: 1rem; padding: 1rem; border: 1px solid var(--color-border); border-radius: .5rem; background: var(--color-surface); }
	h2 { margin: 0 0 .5rem; font-size: 1.15rem; }
	p { line-height: 1.5; }
	fieldset { border: 1px solid var(--color-border); border-radius: .4rem; margin: .85rem 0; padding: .5rem .75rem; }
	legend { font-weight: 600; padding-inline: .25rem; }
	label { display: flex; align-items: baseline; gap: .5rem; min-height: 3rem; padding-block: .4rem; box-sizing: border-box; cursor: pointer; }
	label:hover { background: var(--color-surface-hover); }
	input { accent-color: var(--color-primary); }
	button { padding: .5rem .75rem; min-height: 3rem; border: 1px solid var(--color-border); border-radius: .5rem; color: inherit; font: inherit; background: var(--color-surface); cursor: pointer; }
	button:hover:enabled { background: var(--color-surface-hover); }
	.result { margin: .5rem 0 0; font-weight: 600; }
</style>
