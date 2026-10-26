import { test, expect } from '@playwright/test';

test('restores before opening the editor and synchronizes real browser changes', async ({ page, browser, request }) => {
  test.skip(!process.env.COJUDGE_SYNC_E2E, 'Run with the isolated server-progress config.');
  const data = {
    solutions: { 'two-sum:python': '# saved solution from server' },
    files: { 'two-sum': JSON.stringify([{ fileId: 'persisted-file', fileName: 'solution.py', language: 'python', content: '# saved solution from server', isActive: true, isOpen: true }]) },
    'user-checkboxes': { 'two-sum': true }
  };
  const seed = await request.put('/api/server-progress', { headers: { Origin: 'http://localhost:4175', 'X-CoJudge-Sync': '1' }, data: { baseRevision: 0, data } });
  expect(seed.ok()).toBeTruthy();
  await page.goto('/problems/two-sum');
  await expect(page.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('files')!)['two-sum'])).toContain('# saved solution from server');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('user-checkboxes')!)['two-sum'])).toBe(true);
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('// VPS sync browser proof', { delay: 10 });
  await expect.poll(async () => JSON.stringify((await (await request.get('/api/server-progress')).json()).data.files)).toContain('VPS sync browser proof');
  await page.screenshot({ path: '/tmp/cojudge-editor-server-status.png' });

  // Exercise the actual bookmark UI and wait for a server acknowledgement.
  await page.goto('/?course=basic50');
  await page.getByRole('button', { name: /If Else/ }).click();
  const bookmark = page.locator('button[aria-label*="bookmark" i], button[title*="bookmark" i]').first();
  await expect(bookmark).toBeVisible();
  await bookmark.click();
  await expect.poll(async () => Object.keys((await (await request.get('/api/server-progress')).json()).data['user-bookmarks']).length).toBeGreaterThan(0);

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('http://localhost:4175/');
  await expect(other.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible({ timeout: 15000 });
  expect(await other.evaluate(() => JSON.parse(localStorage.getItem('user-checkboxes')!)['two-sum'])).toBe(true);
  expect(await other.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('user-bookmarks')!)).length)).toBeGreaterThan(0);
  await other.screenshot({ path: '/tmp/cojudge-server-progress-verified.png' });
  await fresh.close();
});
