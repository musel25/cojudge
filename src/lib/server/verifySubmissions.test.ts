import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let root: string;

function write(relative: string, content: string) {
	const file = join(root, relative);
	mkdirSync(join(file, '..'), { recursive: true });
	writeFileSync(file, content);
}

function run() {
	return spawnSync(process.execPath, [join(root, 'scripts', 'verify-submissions.js'), '--report', 'report.json', 'example'], {
		cwd: root,
		encoding: 'utf8',
		timeout: 10_000,
		env: { ...process.env, COJUDGE_CONTENT_DIR: join(root, 'isolated-content'), COJUDGE_HOME: join(root, 'isolated-content') }
	});
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'cojudge-python-reference-test-'));
	write('package.json', '{"type":"module"}');
	mkdirSync(join(root, 'scripts'), { recursive: true });
	copyFileSync(new URL('../../../scripts/verify-submissions.js', import.meta.url), join(root, 'scripts', 'verify-submissions.js'));
	write('bin/cojudge', `
		import { readFileSync } from 'node:fs';
		const source = readFileSync(process.argv[4], 'utf8');
		if (process.argv[2] === 'submit' && process.argv[4].endsWith('Solution.py') && source === 'class Solution:\\n    pass\\n') {
			console.log('ACCEPTED');
		} else {
			console.error('Unexpected reference submission');
			process.exitCode = 1;
		}
	`);
	write('problems/example/solution.md', '## Implementation\n\n```python\nclass Solution:\n    pass\n```\n');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('reference submission verification', () => {
	it('submits the Python reference from solution.md by default', () => {
		const result = run();
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(readFileSync(join(root, 'report.json'), 'utf8'))).toMatchObject([
			{ slug: 'example', language: 'python', passed: true }
		]);
	});

	it('reports a missing Python reference', () => {
		write('problems/example/solution.md', '## Implementation\n\nNo code here.\n');
		const result = run();
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Python reference not found');
	});
});
