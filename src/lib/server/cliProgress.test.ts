import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const progressModule = new URL('../../../bin/lib/progress.js', import.meta.url).href;
let directory: string;
let learnerProgress: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), 'cojudge-cli-progress-test-'));
	learnerProgress = join(directory, 'learner', '.cojudge', 'progress.json');
	mkdirSync(join(directory, 'learner', '.cojudge'), { recursive: true });
	mkdirSync(join(directory, 'content', 'problems', 'fixture-problem'), { recursive: true });
	writeFileSync(learnerProgress, JSON.stringify({ solvedSlugs: ['learner-only'] }));
	env = { ...process.env, COJUDGE_CONTENT_DIR: join(directory, 'content'), COJUDGE_ROOT: directory };
	delete env.COJUDGE_PROGRESS_FILE;
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

function runProgress(expected: string[]) {
	// Redirect os.homedir() inside this child. The real learner directory is never used.
	const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
		import assert from 'node:assert/strict';
		import os from 'node:os';
		os.homedir = () => ${JSON.stringify(join(directory, 'learner'))};
		const { loadProgress, markProblem } = await import(${JSON.stringify(progressModule)});
		assert.deepEqual(loadProgress().solvedSlugs, ${JSON.stringify(expected)});
		markProblem('fixture-problem', true);
	`], { env, encoding: 'utf8' });
	expect(result.stderr).toBe('');
	expect(result.status).toBe(0);
}

describe('CLI progress storage', () => {
	it('reads and updates an explicit progress file without changing learner progress', () => {
		const file = join(directory, 'isolated-progress.json');
		writeFileSync(file, JSON.stringify({ solvedSlugs: ['fixture-only'] }));
		env.COJUDGE_PROGRESS_FILE = file;
		runProgress(['fixture-only']);
		expect(JSON.parse(readFileSync(file, 'utf8')).solvedSlugs).toEqual(['fixture-only', 'fixture-problem']);
		expect(JSON.parse(readFileSync(learnerProgress, 'utf8')).solvedSlugs).toEqual(['learner-only']);
	});

	it('creates parent directories for a new explicit progress file', () => {
		const file = join(directory, 'new', 'nested', 'progress.json');
		env.COJUDGE_PROGRESS_FILE = file;
		runProgress([]);
		expect(JSON.parse(readFileSync(file, 'utf8')).solvedSlugs).toEqual(['fixture-problem']);
		expect(JSON.parse(readFileSync(learnerProgress, 'utf8')).solvedSlugs).toEqual(['learner-only']);
	});

	it('keeps the existing home progress location when no override is set', () => {
		runProgress(['learner-only']);
		expect(JSON.parse(readFileSync(learnerProgress, 'utf8')).solvedSlugs).toEqual(['learner-only', 'fixture-problem']);
	});
});
