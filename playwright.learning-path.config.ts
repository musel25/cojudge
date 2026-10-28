import { defineConfig } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Use a separate content folder and browser profile. Learner data is not used.
const directory = mkdtempSync(join(tmpdir(), 'cojudge-path-e2e-'));
const courseNames = ['oop', 'pytest', 'data-formats', 'collections', 'fastapi', 'sqlmodel', 'datetimes-timezones', 'typer'];
for (const name of courseNames) {
    const id = `pybites-${name}`;
    const ids = [1, 2].map((n) => `${id}-exercise-${n}`);
    const courseDir = join(directory, 'courses', id);
    mkdirSync(courseDir, { recursive: true });
    writeFileSync(join(courseDir, 'courseinfo.json'), JSON.stringify({
        title: `Pybites ${name} Path`, description: 'Learning path browser fixture.',
        'category-order': ['practice'], 'problems-of-category': { practice: ids }
    }));
    for (const problemId of ids) {
        const problemDir = join(directory, 'problems', problemId);
        mkdirSync(problemDir, { recursive: true });
        writeFileSync(join(problemDir, 'metadata.json'), JSON.stringify({
            id: problemId, title: problemId, difficulty: 'Easy'
        }));
    }
}

export default defineConfig({
    testDir: 'e2e', testMatch: 'learning-path.test.ts', workers: 1,
    use: { baseURL: 'http://localhost:4177', channel: 'chrome' },
    webServer: {
        command: 'node build', port: 4177, reuseExistingServer: false,
        env: { PORT: '4177', HOST: '127.0.0.1', ORIGIN: 'http://localhost:4177', COJUDGE_CONTENT_DIR: directory }
    }
});
