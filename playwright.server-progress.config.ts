import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'cojudge-sync-e2e-'));
export default defineConfig({
  testDir: 'e2e', testMatch: 'server-progress.test.ts', workers: 1,
  use: { baseURL: 'http://localhost:4175', channel: 'chrome', extraHTTPHeaders: { 'X-CoJudge-User': 'musel', 'X-CoJudge-Profile': 'musel' } },
  webServer: {
    command: 'node build', port: 4175, reuseExistingServer: false,
    env: { PORT: '4175', HOST: '127.0.0.1', ORIGIN: 'http://localhost:4175',
      COJUDGE_CONTENT_DIR: join(directory, 'content'), COJUDGE_SERVER_PROGRESS_DIR: join(directory, 'progress'),
      COJUDGE_SERVER_PROGRESS_ORIGIN: 'http://localhost:4175', COJUDGE_SERVER_PROGRESS_OWNER: 'musel', COJUDGE_SERVER_PROGRESS_USERS: 'musel,alessa' }
  }
});
