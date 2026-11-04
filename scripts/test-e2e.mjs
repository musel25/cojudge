// Build and test with temporary storage, including during SvelteKit analysis.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = mkdtempSync(join(tmpdir(), 'cojudge-e2e-build-'));
const env = {
	...process.env,
	COJUDGE_CONTENT_DIR: join(directory, 'content'), COJUDGE_HOME: join(directory, 'content'),
	COJUDGE_SERVER_PROGRESS_DIR: '', COJUDGE_SERVER_PROGRESS_ORIGIN: '',
	COJUDGE_SERVER_PROGRESS_OWNER: '', COJUDGE_SERVER_PROGRESS_USERS: '', IS_DEMO_SITE: 'false'
};
try {
	const build = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build'], { stdio: 'inherit', env });
	if (build.error) throw build.error;
	if (build.status !== 0) {
		process.exitCode = build.status ?? 1;
	} else {
		const tests = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)), 'test', ...process.argv.slice(2)], { stdio: 'inherit', env });
		if (tests.error) throw tests.error;
		process.exitCode = tests.status ?? 1;
	}
} finally {
	rmSync(directory, { recursive: true, force: true });
}
