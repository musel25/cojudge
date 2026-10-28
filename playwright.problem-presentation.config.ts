import { defineConfig } from '@playwright/test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const content = mkdtempSync(join(tmpdir(), 'cojudge-presentation-'));
const folder = join(content, 'problems', 'presentation-vehicle');
mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, 'metadata.json'), JSON.stringify({
    id: 'presentation-vehicle', title: 'Subclassing: Vehicles in Motion', difficulty: 'Easy',
    starterCode: { python: 'class Vehicle:\n    pass\n' },
    functionName: 'run', params: [{ name: 'payload', type: 'string' }], outputType: 'string',
    examples: [{ input: 'Car("Toyota", "Corolla", 4, 4).description()', output: "'Toyota Corolla with 4 wheels'" }],
    testCases: [{ payload: '{"test":"test_vehicle"}' }],
    testCaseDescriptions: { test_vehicle: { title: 'test_vehicle', code: 'vehicle = Car("Toyota", "Corolla", 4, 4)\nassert vehicle.description() == "Toyota Corolla with 4 wheels"' } },
    courseHelp: { title: 'Course help', body: 'Keep the supplied tests and runner unchanged.' },
}));
writeFileSync(join(folder, 'statement.md'), 'Practice creating Python subclasses with `super()`.\n\n## Your task\n\nImplement `Vehicle.description()` to return `"<brand> <model> with <wheels> wheels"`.\n\n**Constraints:**\n\n- Counts are nonnegative integers.\n');

export default defineConfig({
    testDir: 'e2e', testMatch: 'problem-presentation.test.ts', workers: 1,
    use: { baseURL: 'http://127.0.0.1:4186', channel: 'chrome' },
    webServer: { command: 'node build', port: 4186, reuseExistingServer: false,
        env: { PORT: '4186', HOST: '127.0.0.1', ORIGIN: 'http://127.0.0.1:4186',
            COJUDGE_CONTENT_DIR: content, COJUDGE_SERVER_PROGRESS_DIR: '', COJUDGE_SERVER_PROGRESS_OWNER: '', COJUDGE_SERVER_PROGRESS_USERS: '' } },
});
