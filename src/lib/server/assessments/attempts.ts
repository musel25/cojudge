import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { packId, type CaseKind, type Json, type Pack, type TraceCase } from './schema';
import type { PythonResult } from './sandbox';

export type Mode = 'learning' | 'assessment';
export type PythonExecutor = (code: string, className: string, cases: {
	method: string; args: Json[];
}[][]) => Promise<PythonResult>;
export type Score = { passed: number; total: number };
export type Mistake = CaseKind | 'syntax' | 'regression';

interface Submission {
	code: string;
	at: number;
	level: number;
	scores: Score[];
	status: PythonResult['status'];
	mistakes: Mistake[];
	passed: boolean;
}

interface Attempt {
	id: string;
	pack: Pack;
	mode: Mode;
	code: string;
	startedAt: number;
	deadlineAt: number | null;
	finishedAt: number | null;
	unlocked: number;
	levelTimes: (number | null)[];
	submissions: Submission[];
	revision: number;
}

const assessmentDuration = 90 * 60 * 1_000;
const validAttemptId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const writes = new Set<string>();

export class AttemptConflict extends Error {}

export class AssessmentStore {
	constructor(private readonly directory: string) {}

	private folder(slug: string) {
		if (!packId.test(slug)) throw new Error('Invalid assessment ID.');
		return join(this.directory, slug);
	}

	private file(slug: string, id: string) {
		if (!validAttemptId.test(id)) throw new Error('Invalid attempt ID.');
		return join(this.folder(slug), `${id}.json`);
	}

	private async write(attempt: Attempt) {
		const file = this.file(attempt.pack.id, attempt.id);
		const temporary = `${file}.${randomUUID()}.tmp`;
		await mkdir(this.folder(attempt.pack.id), { recursive: true, mode: 0o700 });
		try {
			await writeFile(temporary, JSON.stringify(attempt), { mode: 0o600 });
			await rename(temporary, file);
		} finally {
			await rm(temporary, { force: true });
		}
	}

	async start(pack: Pack, mode: Mode, now: number) {
		const attempt: Attempt = {
			id: randomUUID(), pack, mode, code: pack.starter, startedAt: now,
			deadlineAt: mode === 'assessment' ? now + assessmentDuration : null,
			finishedAt: null, unlocked: 1, levelTimes: [null, null, null, null],
			submissions: [], revision: 0
		};
		await this.write(attempt);
		return attempt;
	}

	async get(slug: string, id: string): Promise<Attempt | null> {
		if (!validAttemptId.test(id)) return null;
		try {
			return JSON.parse(await readFile(this.file(slug, id), 'utf8')) as Attempt;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	async history(slug: string) {
		const files = await readdir(this.folder(slug)).catch((error: NodeJS.ErrnoException) => {
			if (error.code === 'ENOENT') return [];
			throw error;
		});
		const attempts = await Promise.all(files.filter((file) => file.endsWith('.json')).map((file) =>
			this.get(slug, file.slice(0, -5))));
		const entries = attempts.flatMap((attempt) => attempt ? [{
			id: attempt.id, mode: attempt.mode, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt,
			unlocked: attempt.unlocked, deadlineAt: attempt.deadlineAt
		}] : []).sort((left, right) => right.startedAt - left.startedAt);
		const mistakes = attempts.flatMap((attempt) => attempt?.submissions ?? [])
			.sort((left, right) => right.at - left.at)
			.slice(0, 30)
			.map((submission) => submission.mistakes);
		return { entries, mistakes };
	}

	async change(
		slug: string, id: string, revision: number, update: (attempt: Attempt) => Attempt | Promise<Attempt>
	) {
		const file = this.file(slug, id);
		// Hold the lock while judging so two requests cannot spend one revision.
		if (writes.has(file)) throw new AttemptConflict('This attempt already has a request in progress.');
		writes.add(file);
		try {
			const current = await this.get(slug, id);
			if (!current || current.revision !== revision) {
				throw new AttemptConflict('This attempt changed. Reload the page and try again.');
			}
			const next = { ...await update(current), revision: revision + 1 };
			await this.write(next);
			return next;
		} finally {
			writes.delete(file);
		}
	}
}

export function closed(attempt: Attempt, now: number) {
	return attempt.finishedAt !== null || (attempt.deadlineAt !== null && now >= attempt.deadlineAt);
}

function requireOpen(attempt: Attempt, now: number) {
	if (closed(attempt, now)) throw new AttemptConflict('This attempt has ended.');
}

export function saveDraft(attempt: Attempt, code: string, now: number) {
	requireOpen(attempt, now);
	return { ...attempt, code };
}

async function grade(attempt: Attempt, code: string, executor: PythonExecutor, includeHidden: boolean) {
	const cases: { scenario: TraceCase; isVisible: boolean; level: number }[] = [];
	for (let index = 0; index < attempt.unlocked; index++) {
		const level = attempt.pack.levels[index];
		cases.push(...level.visible.map((scenario) => ({ scenario, isVisible: true, level: index + 1 })));
		if (includeHidden) {
			cases.push(...level.hidden.map((scenario) => ({ scenario, isVisible: false, level: index + 1 })));
		}
	}

	const result = await executor(code, attempt.pack.className, cases.map(({ scenario }) =>
		scenario.steps.map(({ method, args }) => ({ method, args }))));
	if (result.status === 'ok' && result.traces.length !== cases.length) {
		throw new Error('Assessment runner returned an incomplete result.');
	}
	const scores: Score[] = Array.from({ length: attempt.unlocked }, () => ({ passed: 0, total: 0 }));
	const mistakes = new Set<Mistake>();
	if (result.status === 'syntax') mistakes.add('syntax');
	const visible = cases.flatMap(({ scenario, isVisible, level }, index) => {
		const actual = result.status === 'ok' ? result.traces[index] : [];
		const step = scenario.steps.findIndex(({ expected }, stepIndex) => {
			const output = actual[stepIndex];
			return !output || !('value' in output) || !isDeepStrictEqual(output.value, expected);
		});
		const passed = result.status === 'ok' && step === -1 && actual.length === scenario.steps.length;
		const output = step >= 0 ? actual[step] : undefined;
		scores[level - 1].total++;
		if (passed) scores[level - 1].passed++;
		else if (result.status === 'ok') {
			if (level < attempt.unlocked) mistakes.add('regression');
			else mistakes.add(output && 'error' in output ? 'requirements' : scenario.kind);
		}
		else if (result.status === 'runtime') mistakes.add('requirements');
		if (!isVisible) return [];
		const mismatch = step >= 0 ? scenario.steps[step] : null;
		return [{
			id: scenario.id, level, passed,
			mismatch: mismatch && result.status === 'ok' ? {
				method: mismatch.method, args: mismatch.args, expected: mismatch.expected,
				actual: output && 'value' in output ? output.value : undefined
			} : null
		}];
	});
	return { status: result.status, scores, mistakes: [...mistakes], visible };
}

export async function runVisible(attempt: Attempt, code: string, now: number, executor: PythonExecutor) {
	requireOpen(attempt, now);
	return grade(attempt, code, executor, false);
}

export async function gradeSubmission(attempt: Attempt, code: string, now: number, executor: PythonExecutor) {
	requireOpen(attempt, now);
	const result = await grade(attempt, code, executor, true);
	const passed = result.status === 'ok' && result.scores.every((score) => score.passed === score.total);
	const levelTimes = [...attempt.levelTimes];
	if (passed) levelTimes[attempt.unlocked - 1] = now - attempt.startedAt;
	return {
		...attempt, code, levelTimes,
		unlocked: passed ? Math.min(4, attempt.unlocked + 1) : attempt.unlocked,
		finishedAt: passed && attempt.unlocked === 4 ? now : null,
		submissions: [...attempt.submissions, {
			code, at: now, level: attempt.unlocked, scores: result.scores, status: result.status,
			mistakes: result.mistakes, passed
		}]
	};
}

export function publicAttempt(attempt: Attempt, now: number) {
	return {
		id: attempt.id, title: attempt.pack.title, mode: attempt.mode, code: attempt.code, revision: attempt.revision,
		deadlineAt: attempt.deadlineAt, finishedAt: attempt.finishedAt, closed: closed(attempt, now),
		levelTimes: attempt.levelTimes, unlocked: attempt.unlocked, submissions: attempt.submissions,
		levels: attempt.pack.levels.slice(0, attempt.unlocked).map((level) => ({
			title: level.title, requirements: level.requirements,
			examples: level.visible.map((item) => ({
				id: item.id, steps: item.steps.map(({ method, args, expected }) => ({ method, args, expected }))
			}))
		}))
	};
}
