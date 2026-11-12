import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
	...config,
	projects: config.projects?.filter(project => project.name === 'problem-presentation'),
	webServer: Array.isArray(config.webServer) ? config.webServer.filter(server => server.command.includes('problem-presentation')) : []
});
