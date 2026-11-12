// Verify bundled repository content with an isolated server and CLI progress.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { prepareScriptReferences } from './script-reference.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const slugs = process.argv.slice(2);
for (const slug of slugs) {
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !existsSync(join(root, 'problems', slug))) {
		throw new Error(`Unknown problem slug: ${slug}. Usage: npm run verify:problems -- [problem-slug ...]. Options are not supported.`);
	}
}
const directory = mkdtempSync(join(tmpdir(), 'cojudge-problem-verification-'));
const env = {
	...process.env, COJUDGE_ROOT: root,
	COJUDGE_CONTENT_DIR: join(directory, 'content'), COJUDGE_HOME: join(directory, 'content'),
	COJUDGE_PROGRESS_FILE: join(directory, 'cli-progress.json'),
	COJUDGE_SERVER_PROGRESS_DIR: '', COJUDGE_SERVER_PROGRESS_ORIGIN: '',
	COJUDGE_SERVER_PROGRESS_OWNER: '', COJUDGE_SERVER_PROGRESS_USERS: '', IS_DEMO_SITE: 'false'
};
const scriptPath = name => fileURLToPath(new URL(name, import.meta.url));
async function runNode(file, args = []) {
	const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit', env, cwd: root });
	const [code] = await once(child, 'exit');
	return code ?? 1;
}

let server;
let serverExit;
try {
	const countStatus = await runNode(scriptPath('verify-test-counts.js'), slugs);
	if (countStatus !== 0) {
		process.exitCode = countStatus;
	} else {
		const buildStatus = await runNode(scriptPath('../node_modules/vite/bin/vite.js'), ['build']);
		if (buildStatus !== 0) throw new Error(`Application build failed: ${buildStatus}`);
		// Reserve an unused local port. Never attach the CLI to a learner server.
		const reservation = createServer();
		reservation.listen(0, '127.0.0.1');
		await once(reservation, 'listening');
		const port = reservation.address().port;
		await new Promise(resolve => reservation.close(resolve));
		env.PORT = String(port);
		env.HOST = '127.0.0.1';
		env.ORIGIN = `http://localhost:${port}`;
		server = spawn(process.execPath, [scriptPath('../build')], { stdio: 'inherit', env, cwd: root });
		serverExit = once(server, 'exit');
		let ready = false;
		const deadline = Date.now() + 120_000;
		while (Date.now() < deadline) {
			if (server.exitCode !== null || server.signalCode !== null) throw new Error('Verification server stopped before it was ready.');
			try {
				ready = (await fetch(`${env.ORIGIN}/`, { signal: AbortSignal.timeout(2_000) })).ok;
				if (ready) break;
			} catch { /* Wait for the server and content seeding. */ }
			await delay(250);
		}
		if (!ready) throw new Error('Verification server did not become ready.');
		const referenceRoot = join(directory, 'answers');
		const { scriptSlugs, standardSlugs } = prepareScriptReferences(root, slugs, referenceRoot);
		const standardStatus = standardSlugs.length || slugs.length === 0
			? await runNode(scriptPath('verify-submissions.js'), standardSlugs)
			: 0;
		const scriptStatus = scriptSlugs.length
			? await runNode(scriptPath('verify-submissions.js'), [
				'--languages', 'python', '--solutions-root', referenceRoot, '--run', ...scriptSlugs
			])
			: 0;
		process.exitCode = standardStatus || scriptStatus;
	}
} finally {
	if (server && server.exitCode === null && server.signalCode === null) {
		server.kill('SIGTERM');
		const timeout = setTimeout(() => server.kill('SIGKILL'), 10_000);
		timeout.unref();
		await serverExit;
		clearTimeout(timeout);
	}
	rmSync(directory, { recursive: true, force: true });
}
