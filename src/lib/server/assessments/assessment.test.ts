import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePack } from './schema';
import { AssessmentStore, gradeSubmission, publicAttempt } from './attempts';
import type { PythonExecutor } from './attempts';
import { isLocalAssessmentClient } from './access';

function scenario(id: string) {
	return { id, kind: 'edge', steps: [{ method: 'value', args: [], expected: 1 }] };
}

function example() {
	return {
		schemaVersion: 1, id: 'sample', title: 'Sample', summary: 'Make a sample.',
		className: 'Sample', starter: 'class Sample: pass',
		levels: Array.from({ length: 4 }, (_, index) => ({
			title: `Title ${index}`, requirements: `Requirements ${index}`,
			visible: [scenario(`visible-${index}`)], hidden: [scenario(`hidden-secret-${index}`)]
		}))
	};
}

const directories: string[] = [];
async function store() {
	const directory = await mkdtemp(join(tmpdir(), 'cojudge-assessments-test-'));
	directories.push(directory);
	return { directory, repository: new AssessmentStore(directory) };
}
afterEach(async () => {
	for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe('assessment packs', () => {
	it('requires exactly four levels and visible and hidden cases in every level', () => {
		const pack = example();
		expect(parsePack(pack).levels).toHaveLength(4);
		expect(() => parsePack({ ...pack, levels: pack.levels.slice(0, 3) })).toThrow();
		pack.levels[2].hidden = [];
		expect(() => parsePack(pack)).toThrow();
	});
});

describe('local assessment access', () => {
	it('requires a loopback address and a local browser host without profiles', () => {
		expect(isLocalAssessmentClient('localhost', '127.0.0.1')).toBe(true);
		expect(isLocalAssessmentClient('cojudge.localhost', '::ffff:127.0.0.1')).toBe(true);
		expect(isLocalAssessmentClient('[::1]', '::1')).toBe(true);
		expect(isLocalAssessmentClient('localhost', '192.168.1.2')).toBe(false);
		expect(isLocalAssessmentClient('cojudge.example', '127.0.0.1')).toBe(false);
	});
});

describe('assessment attempts', () => {
	it('keeps source and first completion times, and prevents regressions from unlocking stages', async () => {
		const { directory, repository } = await store();
		const pack = parsePack(example());
		const attempt = await repository.start(pack, 'learning', 100);
		const judge = vi.fn<Parameters<PythonExecutor>, ReturnType<PythonExecutor>>(async (_source, _className, inputs) => ({
			status: 'ok', traces: inputs.map(() => [{ value: 1 }])
		}));
		const first = await repository.change(pack.id, attempt.id, 0, (current) =>
			gradeSubmission(current, 'first', 110, judge));
		expect(first.unlocked).toBe(2);
		expect(first.levelTimes).toEqual([10, null, null, null]);
		judge.mockImplementationOnce(async (_source, _className, inputs) => ({
			status: 'ok', traces: inputs.map((_, index) => [{ value: index === 0 ? 0 : 1 }])
		}));
		const second = await repository.change(pack.id, attempt.id, 1, (current) =>
			gradeSubmission(current, 'second', 120, judge));
		expect(judge.mock.calls[1][2]).toHaveLength(4);
		expect(second.unlocked).toBe(2);
		expect(second.submissions[1].scores).toMatchObject([{ passed: 1, total: 2 }, { passed: 2, total: 2 }]);
		const reloaded = await new AssessmentStore(directory).get(pack.id, attempt.id);
		expect(reloaded?.code).toBe('second');
		expect(reloaded?.submissions.map((entry) => entry.code)).toEqual(['first', 'second']);
		const view = JSON.stringify(publicAttempt(second, 130));
		expect(view).toContain('Requirements 1');
		expect(view).not.toContain('Requirements 2');
		expect(view).not.toContain('hidden-secret');
	});

	it('does not run after expiry or persist stale writers and runner failures', async () => {
		const { repository } = await store();
		const pack = parsePack(example());
		const attempt = await repository.start(pack, 'assessment', 100);
		expect(attempt.deadlineAt).toBe(5_400_100);
		const judge = vi.fn(async () => { throw new Error('Docker unavailable'); });
		await expect(repository.change(pack.id, attempt.id, 0, (current) =>
			gradeSubmission(current, 'expired', 5_400_100, judge))).rejects.toThrow('ended');
		expect(judge).not.toHaveBeenCalled();
		await expect(repository.change(pack.id, attempt.id, 0, (current) =>
			gradeSubmission(current, 'failed', 110, judge))).rejects.toThrow('Docker unavailable');
		await repository.change(pack.id, attempt.id, 0, (current) => ({ ...current, code: 'draft' }));
		await expect(repository.change(pack.id, attempt.id, 0, (current) => current)).rejects.toThrow('changed');
		expect(await repository.get(pack.id, attempt.id)).toMatchObject({ code: 'draft', submissions: [] });
	});

	it('finishes all four levels with one source file per submission', async () => {
		const { repository } = await store();
		const pack = parsePack(example());
		let attempt = await repository.start(pack, 'learning', 100);
		for (let level = 1; level <= 4; level++) {
			attempt = await repository.change(pack.id, attempt.id, attempt.revision, (current) =>
				gradeSubmission(current, `source ${level}`, 100 + level, async (_code, _className, cases) => ({
					status: 'ok', traces: cases.map(() => [{ value: 1 }])
				})));
		}
		expect(attempt.finishedAt).toBe(104);
		expect(attempt.levelTimes).toEqual([1, 2, 3, 4]);
		expect(attempt.code).toBe('source 4');
	});

	it('classifies a missing or crashing method as a contract issue before using case tags', async () => {
		const { repository } = await store();
		const pack = parsePack(example());
		const attempt = await repository.start(pack, 'learning', 100);
		const result = await gradeSubmission(attempt, 'class Sample: pass', 101, async (_code, _className, cases) => ({
			status: 'ok', traces: cases.map(() => [{ error: true }])
		}));
		expect(result.submissions[0].mistakes).toEqual(['requirements']);
	});
});
