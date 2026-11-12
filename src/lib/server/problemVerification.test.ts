import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

let root: string;
let trace: string;

function write(relative: string, content: string) {
	const file = join(root, relative);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, content);
}

function serverSource(version: string) {
	return `
		import { createServer } from 'node:http';
		import { appendFileSync } from 'node:fs';
		const server = createServer((_request, response) => response.end(${JSON.stringify(version)}));
		server.listen(Number(process.env.PORT), process.env.HOST, () => {
			appendFileSync(${JSON.stringify(trace)}, JSON.stringify({ step: 'server', pid: process.pid }) + '\\n');
		});
	`;
}

function fixture({ countStatus = 0, buildStatus = 0, submissionStatus = 0 } = {}) {
	const event = (step: string) => `
		import { appendFileSync } from 'node:fs';
		appendFileSync(${JSON.stringify(trace)}, JSON.stringify({
			step: ${JSON.stringify(step)}, args: process.argv.slice(2),
			directory: process.env.COJUDGE_HOME, progress: process.env.COJUDGE_PROGRESS_FILE
		}) + '\\n');
	`;
	write('scripts/verify-test-counts.js', `${event('counts')} process.exitCode = ${countStatus};`);
	write('node_modules/vite/bin/vite.js', `
		${event('build')}
		import { writeFileSync } from 'node:fs';
		writeFileSync(${JSON.stringify(join(root, 'build', 'index.js'))}, ${JSON.stringify(serverSource('current'))});
		process.exitCode = ${buildStatus};
	`);
	write('scripts/verify-submissions.js', `
		${event('submissions')}
		import assert from 'node:assert/strict';
		import { writeFileSync } from 'node:fs';
		assert.equal(await (await fetch(process.env.ORIGIN)).text(), 'current');
		writeFileSync(process.env.COJUDGE_PROGRESS_FILE, 'isolated CLI progress');
		process.exitCode = ${submissionStatus};
	`);
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'cojudge-verification-wrapper-test-'));
	trace = join(root, 'events.jsonl');
	write('package.json', '{"type":"module"}');
	write('build/index.js', serverSource('stale'));
	write('learner/progress.json', 'learner progress');
	mkdirSync(join(root, 'problems', 'fixture-problem'), { recursive: true });
	mkdirSync(join(root, 'scripts'), { recursive: true });
	copyFileSync(new URL('../../../scripts/verify-problems.mjs', import.meta.url), join(root, 'scripts', 'verify-problems.mjs'));
	copyFileSync(new URL('../../../scripts/script-reference.mjs', import.meta.url), join(root, 'scripts', 'script-reference.mjs'));
	write('problems/fixture-problem/metadata.json', '{"scriptMode":false}');
	fixture();
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(args = ['fixture-problem']) {
	return spawnSync(process.execPath, [join(root, 'scripts', 'verify-problems.mjs'), ...args], {
		cwd: root,
		encoding: 'utf8',
		timeout: 10_000,
		env: { ...process.env, COJUDGE_CONTENT_DIR: join(root, 'learner'), COJUDGE_PROGRESS_FILE: join(root, 'learner', 'progress.json') }
	});
}
function events(): { step: string; args?: string[]; directory?: string; progress?: string; pid?: number }[] {
	return existsSync(trace) ? readFileSync(trace, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
}
function expectCleanup() {
	const recorded = events();
	const counts = recorded.find(event => event.step === 'counts')!;
	expect(existsSync(dirname(counts.directory!))).toBe(false);
	expect(readFileSync(join(root, 'learner', 'progress.json'), 'utf8')).toBe('learner progress');
	const server = recorded.find(event => event.step === 'server');
	if (server) expect(() => process.kill(server.pid!, 0)).toThrow();
}

describe('problem verification wrapper', () => {
	it('rebuilds a stale server before submissions and cleans up its isolated state', () => {
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(events().map(event => event.step)).toEqual(['counts', 'build', 'server', 'submissions']);
		for (const step of ['counts', 'submissions']) {
			expect(events().find(event => event.step === step)?.args).toEqual(['fixture-problem']);
		}
		expectCleanup();
	});

	it('stops before build and server startup when test counts fail', () => {
		fixture({ countStatus: 7 });
		const result = run();
		expect(result.status, result.stderr).toBe(7);
		expect(events().map(event => event.step)).toEqual(['counts']);
		expectCleanup();
	});

	it('stops before server startup when the build fails', () => {
		fixture({ buildStatus: 9 });
		const result = run();
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Application build failed: 9');
		expect(events().map(event => event.step)).toEqual(['counts', 'build']);
		expectCleanup();
	});

	it('stops the server and removes temporary state when submissions fail', () => {
		fixture({ submissionStatus: 23 });
		const result = run();
		expect(result.status, result.stderr).toBe(23);
		expect(events().map(event => event.step)).toEqual(['counts', 'build', 'server', 'submissions']);
		expectCleanup();
	});

	it('rejects unsupported options before running checks or a server', () => {
		const result = run(['--languages', 'java']);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Options are not supported.');
		expect(events()).toEqual([]);
	});

	it('submits a Python answer for a script-mode problem', () => {
		write('problems/fixture-problem/metadata.json', '{"scriptMode":true}');
		write('problems/fixture-problem/solution.md', '```python\nprint(3)\n```\n');
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(events().map(event => event.step)).toEqual(['counts', 'build', 'server', 'submissions']);
		expect(events().find(event => event.step === 'submissions')?.args).toEqual([
			'--languages', 'python', '--solutions-root', expect.any(String), '--run', 'fixture-problem'
		]);
		expectCleanup();
	});
});
