import { defineConfig } from '@playwright/test';

const suites = [
	{ name: 'general', port: 4173 },
	{ name: 'problem-presentation', port: 4186, testMatch: 'problem-presentation.test.ts' },
	{ name: 'learning-path', port: 4177, testMatch: 'learning-path.test.ts' },
	{ name: 'server-progress', port: 4175, testMatch: 'server-progress.test.ts' }
];

export default defineConfig({
	testDir: 'e2e',
	workers: 2,
	forbidOnly: Boolean(process.env.CI),
	use: {
		browserName: 'chromium',
		trace: 'retain-on-failure'
	},
	projects: suites.map(({ name, port, testMatch }) => ({
		name,
		...(testMatch ? { testMatch } : { testIgnore: suites.flatMap(suite => suite.testMatch ? [suite.testMatch] : []) }),
		use: {
			baseURL: `http://localhost:${port}`,
			...(name === 'server-progress' ? { extraHTTPHeaders: { 'X-CoJudge-User': 'musel', 'X-CoJudge-Profile': 'musel' } } : {})
		}
	})),
	webServer: suites.map(({ name, port }) => ({
		command: `node scripts/e2e-server.mjs ${name} ${port}`,
		url: `http://localhost:${port}`,
		timeout: 120_000,
		reuseExistingServer: false,
		gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 }
	}))
});
