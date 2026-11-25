import { error, fail, redirect } from '@sveltejs/kit';
import { assessmentContext, loadPack } from '$lib/server/assessments/catalog';
import { AttemptConflict, gradeSubmission, publicAttempt, runVisible, saveDraft } from '$lib/server/assessments/attempts';
import { checkQuestions, publicQuestions, recommendDrill } from '$lib/server/assessments/practice';
import { MAX_SOURCE_BYTES, packId } from '$lib/server/assessments/schema';
import { executePython } from '$lib/server/assessments/sandbox';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function requirePack(slug: string) {
	const pack = await loadPack(slug).catch(() => error(422, 'Check the assessment problem pack.'));
	if (!pack) error(404, 'Assessment not found.');
	return pack;
}

function checkSlug(slug: string) {
	if (slug.length > 80 || !packId.test(slug)) error(404, 'Assessment not found.');
}

export const load: PageServerLoad = async (event) => {
	const { params, setHeaders, url } = event;
	const { profile, store } = assessmentContext(event);
	setHeaders({ 'cache-control': 'no-store' });
	const slug = params.slug;
	checkSlug(slug);
	const id = url.searchParams.get('attempt');
	const attempt = id ? await store.get(slug, id) : null;
	if (id && !attempt) error(404, 'Attempt not found.');
	const pack = attempt?.pack ?? await requirePack(slug);
	const { entries, mistakes } = await store.history(slug);
	const comprehension = attempt?.mode === 'learning' ? pack.levels[attempt.unlocked - 1].comprehension : null;
	const drill = attempt?.mode === 'learning' ? recommendDrill(mistakes) : null;
	return {
		slug, profile, title: pack.title, summary: pack.summary, now: Date.now(),
		history: entries,
		comprehension: comprehension && { method: comprehension.method, questions: publicQuestions(comprehension.questions) },
		drill: drill && { title: drill.title, questions: publicQuestions(drill.questions), kind: drill.kind },
		attempt: attempt && publicAttempt(attempt, Date.now())
	};
};

function update(kind: 'save' | 'run' | 'submit') {
	return async (event: RequestEvent) => {
		const { params, request } = event;
		const { profile, store } = assessmentContext(event);
		const fields = await request.formData();
		const now = Date.now();
		if (fields.get('profile') !== profile) return fail(403, { error: 'The profile changed. Reload this page.' });
		const id = fields.get('id');
		const code = fields.get('code');
		const revisionField = fields.get('revision');
		const revision = typeof revisionField === 'string' && /^\d+$/.test(revisionField) ? Number(revisionField) : NaN;
		if (typeof id !== 'string' || !Number.isSafeInteger(revision) || typeof code !== 'string' ||
			Buffer.byteLength(code) > MAX_SOURCE_BYTES) {
			return fail(400, { error: 'Check the attempt and keep the Python source under 64 KiB.' });
		}
		const slug = params.slug;
		checkSlug(slug);
		if (!await store.get(slug, id)) return fail(404, { error: 'Attempt not found.' });
		try {
			let run: Awaited<ReturnType<typeof runVisible>> | undefined;
			await store.change(slug, id, revision, async (attempt) => {
				if (kind === 'submit') return gradeSubmission(attempt, code, now, executePython);
				const draft = saveDraft(attempt, code, now);
				if (kind === 'run') run = await runVisible(attempt, code, now, executePython);
				return draft;
			});
			return { saved: kind === 'save', submitted: kind === 'submit', run };
		} catch (cause) {
			if (cause instanceof AttemptConflict) return fail(409, { error: cause.message });
			return fail(503, { error: kind === 'save' ? 'Cojudge could not save the draft.' :
				'Cojudge could not complete this run. Check Docker and try again.' });
		}
	};
}

export const actions = {
	start: async (event) => {
		const { params, request, url } = event;
		const { profile, store } = assessmentContext(event);
		const fields = await request.formData();
		if (fields.get('profile') !== profile) return fail(403, { error: 'The profile changed. Reload this page.' });
		const mode = fields.get('mode');
		if (mode !== 'learning' && mode !== 'assessment') return fail(400, { error: 'Select an attempt mode.' });
		const pack = await requirePack(params.slug);
		const attempt = await store.start(pack, mode, Date.now());
		redirect(303, `${url.pathname}?attempt=${attempt.id}`);
	},
	save: update('save'),
	run: update('run'),
	submit: update('submit'),
	practice: async (event) => {
		const { params, request } = event;
		const { store, profile } = assessmentContext(event);
		checkSlug(params.slug);
		const fields = await request.formData();
		if (fields.get('profile') !== profile) return fail(403, { error: 'The profile changed. Reload this page.' });
		const id = fields.get('id');
		const attempt = typeof id === 'string' ? await store.get(params.slug, id) : null;
		if (!attempt || attempt.mode !== 'learning') return fail(404, { error: 'Practice requires a learning attempt.' });
		if (fields.get('level') !== String(attempt.unlocked)) return fail(409, { error: 'This level changed. Reload the page.' });

		const choice = fields.get('exercise');
		if (typeof choice !== 'string') return fail(400, { error: 'Select a practice exercise.' });
		const comprehension = attempt.pack.levels[attempt.unlocked - 1].comprehension;
		const drill = choice === 'comprehension' ? null : recommendDrill((await store.history(params.slug)).mistakes);
		const questions = choice === 'comprehension' ? comprehension?.questions : choice === drill?.kind ? drill?.questions : null;
		if (!questions) return fail(404, { error: 'Practice is unavailable for this selection.' });
		const answers = questions.map((_, index) => fields.get(`answer-${index}`) ?? '');
		const feedback = checkQuestions(questions, answers);
		if (!feedback) return fail(400, { error: 'Select an answer for each question.' });
		return { practice: { exercise: choice, feedback } };
	}
} satisfies Actions;
