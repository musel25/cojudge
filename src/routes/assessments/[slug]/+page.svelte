<script lang="ts">
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';
	import { untrack } from 'svelte';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import PracticeQuestions from './PracticeQuestions.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let code = $state(untrack(() => data.attempt?.code ?? ''));
	let monaco = $state(false);
	let busy = $state(false);
	let now = $state(0);
	let attempt = $derived(data.attempt);
	let remaining = $derived(attempt?.deadlineAt == null ? null :
		Math.max(0, Math.ceil((attempt.deadlineAt - (now || data.now)) / 1_000)));
	let ended = $derived(Boolean(attempt?.closed || remaining === 0));
	let last = $derived(attempt?.submissions.at(-1));
	let practice = $derived(form && 'practice' in form ? form.practice : undefined);
	const modeName = { assessment: '90-minute assessment', learning: 'Unlimited learning' };
	const mistakes = {
		requirements: 'Requirements misunderstanding', syntax: 'Python syntax error',
		state: 'Incorrect state update', validation: 'Missing validation', edge: 'Edge case',
		regression: 'Regression in a previous level'
	};
	const formatTime = (seconds: number) =>
		`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

	$effect(() => {
		const id = attempt?.id;
		code = untrack(() => id ? attempt?.code ?? '' : '');
	});

	$effect(() => {
		const serverTime = data.now;
		const clientTime = Date.now();
		const tick = () => { now = serverTime + Date.now() - clientTime; };
		tick();
		const interval = setInterval(tick, 1_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head><title>{data.title} | Cojudge assessments</title></svelte:head>

<h1>{data.title}</h1>
{#if !attempt}
	<p>{data.summary}</p>
	<form method="POST" action="?/start" class="actions">
		<input type="hidden" name="profile" value={data.profile} />
		<button name="mode" value="learning" type="submit" class="primary">Start learning</button>
		<button name="mode" value="assessment" type="submit">Start 90-minute assessment</button>
	</form>
{:else}
	<div class="attempt-meta">
		<p>{modeName[attempt.mode]}</p>
		{#if attempt.finishedAt !== null}
			<strong>All four levels passed</strong>
		{:else if ended}
			<strong role="status">Time ended</strong>
		{:else if remaining !== null}
			<span class="time"><span class="time-label">Time left</span> {formatTime(remaining)}</span>
		{/if}
		<a href={`${base}/assessments/${data.slug}`}>New attempt</a>
	</div>

	<ol class="levels" aria-label="Level progress">
		{#each [1, 2, 3, 4] as level}
			<li aria-current={level === attempt.unlocked && !ended ? 'step' : undefined}>
				{#if level > attempt.unlocked}
					Level {level} · Locked
				{:else}
					<span>Level {level}</span>
					{#if attempt.levelTimes[level - 1] != null}
						<span>Passed at {formatTime(Math.floor((attempt.levelTimes[level - 1] ?? 0) / 1_000))}</span>
					{:else}
						<span>{ended ? 'Incomplete' : 'In progress'}</span>
					{/if}
					{#if last?.scores[level - 1]}
						<span>{last.scores[level - 1].passed}/{last.scores[level - 1].total} tests passed</span>
					{/if}
				{/if}
			</li>
		{/each}
	</ol>

	<div class="workspace">
		<section class="panel" aria-labelledby="requirements-heading">
			<h2 id="requirements-heading">Requirements</h2>
			{#if data.comprehension}<p><a href="#practice-comprehension">Check your understanding</a></p>{/if}
			{#each attempt.levels as level, index (index)}
				<details open={index + 1 === attempt.unlocked}>
					<summary>Level {index + 1} · {level.title}</summary>
					<p class="requirements">{level.requirements}</p>
					{#each level.examples as example (example.id)}
						<details class="case">
							<summary>{example.id}</summary>
							<pre>{example.steps.map(({ method, args, expected }) =>
								`${method}(${args.map((argument) => JSON.stringify(argument)).join(', ')}) → ${JSON.stringify(expected)}`).join('\n')}</pre>
						</details>
					{/each}
				</details>
			{/each}
		</section>

		<section class="panel" aria-labelledby="editor-heading">
			<div class="editor-heading">
				<h2 id="editor-heading"><label for={monaco ? undefined : 'python-code'}>Python source</label></h2>
				<button type="button" aria-pressed={monaco} onclick={() => { monaco = !monaco; }}>
					{monaco ? 'Use plain editor' : 'Use code editor'}
				</button>
			</div>
			<form method="POST" action={`?/save&attempt=${attempt.id}`} aria-labelledby="editor-heading" use:enhance={({ cancel }) => {
				if (busy) { cancel(); return; }
				busy = true;
				return async ({ update }) => {
					try { await update({ reset: false }); }
					finally { busy = false; }
				};
			}}>
				<input type="hidden" name="id" value={attempt.id} />
				<input type="hidden" name="profile" value={data.profile} />
				<input type="hidden" name="revision" value={attempt.revision} />
				{#if monaco}
					<div class="monaco"><CodeEditor bind:value={code} language="python" readOnly={ended || busy} /></div>
					<input type="hidden" name="code" value={code} />
				{:else}
					<textarea id="python-code" name="code" bind:value={code} readonly={ended || busy}
						autocapitalize="none" spellcheck="false" rows="18"></textarea>
				{/if}
				{#if !ended}
					<div class="actions">
						<button type="submit" disabled={busy}>Save draft</button>
						<button type="submit" formaction={`?/run&attempt=${attempt.id}`} disabled={busy}>Run visible tests</button>
						<button type="submit" formaction={`?/submit&attempt=${attempt.id}`} disabled={busy} class="primary">Submit</button>
					</div>
				{/if}
			</form>

			<div role="status">
				{#if busy}<p>Working…</p>{/if}
				{#if form && 'saved' in form && form.saved}<p>Draft saved</p>{/if}
				{#if form && 'submitted' in form && form.submitted && last}
					<p>{last.passed ? `Level ${last.level} passed` : `Level ${last.level} did not pass`}</p>
				{/if}
				{#if form && 'run' in form && form.run}
					{#each form.run.visible as result}
						<p>Level {result.level} · {result.id} · {result.passed ? 'Passed' : 'Failed'}</p>
						{#if result.mismatch}
							<pre>{result.mismatch.method}({result.mismatch.args.map((argument) => JSON.stringify(argument)).join(', ')})
Expected {JSON.stringify(result.mismatch.expected)}
Received {result.mismatch.actual === undefined ? 'Python error' : JSON.stringify(result.mismatch.actual)}</pre>
						{/if}
					{/each}
					{#if form.run.status !== 'ok'}<p>Run result · {form.run.status}</p>{/if}
				{/if}
			</div>
		</section>
	</div>

	{#if data.comprehension}
		<PracticeQuestions heading="Requirements comprehension"
			intro={`Check the requirements for ${data.comprehension.method} before you code.`}
			exercise="comprehension" attemptId={attempt.id} level={attempt.unlocked} profile={data.profile}
			questions={data.comprehension.questions} button="Check requirements"
			feedback={practice?.exercise === "comprehension" ? practice.feedback : undefined} />
	{/if}
	{#if data.drill}
		<PracticeQuestions heading={data.drill.title} intro={`Recall drill · ${mistakes[data.drill.kind]}`}
			exercise={data.drill.kind} attemptId={attempt.id} level={attempt.unlocked} profile={data.profile}
			questions={data.drill.questions} button="Check drill"
			feedback={practice?.exercise === data.drill.kind ? practice.feedback : undefined} />
	{/if}

	{#if last}
		<section class="history" aria-labelledby="submissions-heading">
			<h2 id="submissions-heading">Submissions</h2>
			{#each [...attempt.submissions].reverse() as submission, index}
				<details>
					<summary>Submission {attempt.submissions.length - index} · {submission.passed ? 'Passed' : 'Failed'} · Level {submission.level}</summary>
					{#each submission.scores as score, level}
						<p>Level {level + 1} · {score.passed}/{score.total} tests passed</p>
					{/each}
					{#if submission.status === 'timeout'}<p>The execution time limit ended.</p>{/if}
					{#each submission.mistakes as mistake}
						<p>{mistakes[mistake]}</p>
					{/each}
					<pre>{submission.code}</pre>
				</details>
			{/each}
		</section>
	{/if}
{/if}

{#if form && 'error' in form}<p role="alert">{form.error}</p>{/if}

<section class="history" aria-labelledby="attempts-heading">
	<h2 id="attempts-heading">Attempt history</h2>
	{#each data.history as entry (entry.id)}
		<p><a href={`?attempt=${entry.id}`} aria-current={entry.id === attempt?.id ? 'page' : undefined}>{modeName[entry.mode]}</a>
			· <time datetime={new Date(entry.startedAt).toISOString()}>{new Date(entry.startedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC</time>
			· {entry.finishedAt !== null ? 'Completed' : `Level ${entry.unlocked}`}</p>
	{:else}
		<p>Start an attempt to save your progress here.</p>
	{/each}
</section>

<style>
	a { color: inherit; text-underline-offset: .25rem; }
	h1 { margin: 0 0 .75rem; }
	h2 { font-size: 1.15rem; margin: 0 0 .75rem; }
	p { line-height: 1.5; }
	.attempt-meta, .actions, .editor-heading { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
	.attempt-meta p { margin: 0; }
	.time { font-variant-numeric: tabular-nums; }
	.time-label { color: var(--color-text-secondary); }
	.actions { margin-top: .85rem; }
	button { border: 1px solid var(--color-border); border-radius: .5rem; min-height: 3rem; padding: .5rem .75rem; font: inherit; color: inherit; background: var(--color-surface); cursor: pointer; }
	button:hover:enabled { background: var(--color-surface-hover); }
	button:disabled { opacity: .65; cursor: wait; }
	button.primary { background: var(--color-primary); color: var(--color-primary-text); font-weight: 600; }
	button.primary:hover:enabled { background: var(--color-primary); filter: brightness(.92); }
	.levels { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .5rem; }
	.levels li { display: grid; gap: .25rem; padding: .75rem; border-radius: .5rem; border: 1px solid var(--color-border); }
	.levels li[aria-current] { border-color: var(--color-text-secondary); background: var(--color-surface); }
	.levels span + span { color: var(--color-text-secondary); font-size: .85rem; }
	.workspace { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 1rem; align-items: start; }
	.panel, .history { border: 1px solid var(--color-border); border-radius: .5rem; padding: 1rem; background: var(--color-surface); }
	.editor-heading { justify-content: space-between; margin-bottom: .75rem; }
	.editor-heading h2 { margin: 0; }
	textarea, .monaco { display: block; box-sizing: border-box; width: 100%; min-height: 24rem; color: inherit; border: 1px solid var(--color-border); background: var(--color-code-bg); }
	textarea, pre { font: 1rem/1.5 var(--font-mono); }
	textarea { padding: .75rem; resize: vertical; }
	.monaco { height: 29rem; }
	.requirements { white-space: pre-wrap; overflow-wrap: anywhere; }
	pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: .75rem; background: var(--color-code-bg); border-radius: .4rem; }
	details { border-top: 1px solid var(--color-border); padding-block: .6rem; }
	summary { cursor: pointer; font-weight: 600; }
	.case summary { font-weight: 400; }
	.history { margin-top: 1rem; }
	[role="alert"] { color: var(--color-incorrect); }
	@media (max-width: 50rem) { .workspace { grid-template-columns: minmax(0, 1fr); } }
	@media (max-width: 32rem) { .levels { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
