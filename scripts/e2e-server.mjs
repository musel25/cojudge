// Each browser project owns its content and progress. Never use learner data.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [suite, port] = process.argv.slice(2);
if (!['general', 'problem-presentation', 'learning-path', 'server-progress'].includes(suite) || !/^\d+$/.test(port)) {
	throw new Error('Usage: node scripts/e2e-server.mjs <suite> <port>');
}
const directory = mkdtempSync(join(tmpdir(), `cojudge-${suite}-e2e-`));
const content = join(directory, 'content');
function writeContent(parts, value) {
	const target = join(content, ...parts);
	mkdirSync(join(target, '..'), { recursive: true });
	writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}

if (suite === 'learning-path') {
	const courseNames = ['oop', 'pytest', 'data-formats', 'collections', 'fastapi', 'sqlmodel', 'datetimes-timezones', 'typer'];
	for (const name of courseNames) {
		const id = `pybites-${name}`;
		const ids = [1, 2].map(number => `${id}-exercise-${number}`);
		writeContent(['courses', id, 'courseinfo.json'], {
			title: `Pybites ${name} Path`, description: 'Learning path browser fixture.',
			'category-order': ['practice'], 'problems-of-category': { practice: ids }
		});
		for (const problemId of ids) {
			writeContent(['problems', problemId, 'metadata.json'], {
				id: problemId, title: problemId, difficulty: 'Easy'
			});
		}
	}
}
if (suite === 'problem-presentation') {
	writeContent(['problems', 'presentation-vehicle', 'metadata.json'], {
		id: 'presentation-vehicle', title: 'Subclassing: Vehicles in Motion', difficulty: 'Easy',
		starterCode: { python: 'class Vehicle:\n    pass\n' },
		functionName: 'run', params: [{ name: 'payload', type: 'string' }], outputType: 'string',
		examples: [{ input: 'Car("Toyota", "Corolla", 4, 4).description()', output: "'Toyota Corolla with 4 wheels'" }],
		testCases: [{ payload: '{"test":"test_vehicle"}' }],
		testCaseDescriptions: { test_vehicle: { title: 'test_vehicle', code: 'vehicle = Car("Toyota", "Corolla", 4, 4)\nassert vehicle.description() == "Toyota Corolla with 4 wheels"' } },
		courseHelp: { title: 'Course help', body: 'Keep the supplied tests and runner unchanged.' }
	});
	writeContent(['problems', 'presentation-vehicle', 'statement.md'], 'Practice creating Python subclasses with `super()`.\n\n## Your task\n\nImplement `Vehicle.description()` to return `"<brand> <model> with <wheels> wheels"`.\n\n**Constraints:**\n\n- Counts are nonnegative integers.\n');
}

const origin = `http://localhost:${port}`;
const child = spawn(process.execPath, ['build'], {
	stdio: 'inherit',
	env: {
		...process.env,
		PORT: port, HOST: '0.0.0.0', IS_DEMO_SITE: 'false',
		COJUDGE_CONTENT_DIR: content, COJUDGE_HOME: content,
		COJUDGE_SERVER_PROGRESS_DIR: suite === 'server-progress' ? join(directory, 'progress') : '',
		COJUDGE_SERVER_PROGRESS_ORIGIN: suite === 'server-progress' ? origin : '',
		COJUDGE_SERVER_PROGRESS_OWNER: suite === 'server-progress' ? 'musel' : '',
		COJUDGE_SERVER_PROGRESS_USERS: suite === 'server-progress' ? 'musel,alessa' : '',
		// Infer the origin for the general project's cojudge.localhost desktop test.
		ORIGIN: suite === 'general' ? undefined : origin
	}
});
for (const signal of ['SIGTERM', 'SIGINT']) {
	process.on(signal, () => child.kill(signal));
}
child.on('error', error => {
	console.error(error);
	rmSync(directory, { recursive: true, force: true });
	process.exitCode = 1;
});
child.on('exit', code => {
	rmSync(directory, { recursive: true, force: true });
	process.exitCode = code ?? 0;
});
