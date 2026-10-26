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
  await page.getByRole('button', { name: 'Submit', exact: true }).click({ trial: true, timeout: 1500 });

  // A different device replaces the active file. Both open local tabs must
  // reload from that snapshot, without recreating their deleted editor tabs.
  const sibling = await page.context().newPage();
  await sibling.goto('http://localhost:4175/problems/two-sum');
  await expect(sibling.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible();
  const beforeReplace = await (await request.get('/api/server-progress')).json();
  beforeReplace.data.files['two-sum'] = JSON.stringify([{ fileId: 'replacement-file', fileName: 'replacement.java', language: 'java', content: '// replacement from another browser', isActive: true, isOpen: true }]);
  const replace = await request.put('/api/server-progress', { headers: { Origin: 'http://localhost:4175', 'X-CoJudge-Sync': '1' }, data: { baseRevision: beforeReplace.revision, data: beforeReplace.data } });
  expect(replace.ok()).toBeTruthy();
  for (const tab of [page, sibling]) {
    await expect(tab.getByText('replacement.java', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(tab.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible();
  }
  expect(JSON.stringify((await (await request.get('/api/server-progress')).json()).data.files)).not.toContain('persisted-file');
  await sibling.close();

  // Exercise the actual bookmark UI and wait for a server acknowledgement.
  await page.goto('/?course=basic50');
  await page.getByRole('button', { name: /If Else/ }).click();
  const bookmark = page.locator('button[aria-label*="bookmark" i], button[title*="bookmark" i]').first();
  await expect(bookmark).toBeVisible();
  await bookmark.click();
  await expect.poll(async () => Object.keys((await (await request.get('/api/server-progress')).json()).data['user-bookmarks']).length).toBeGreaterThan(0);

  const fresh = await browser.newContext({ extraHTTPHeaders: { 'X-CoJudge-User': 'musel' } });
  const other = await fresh.newPage();
  await other.goto('http://localhost:4175/');
  await expect(other.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible({ timeout: 15000 });
  expect(await other.evaluate(() => JSON.parse(localStorage.getItem('user-checkboxes')!)['two-sum'])).toBe(true);
  expect(await other.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('user-bookmarks')!)).length)).toBeGreaterThan(0);
  await other.screenshot({ path: '/tmp/cojudge-server-progress-verified.png' });
  await fresh.close();
});

test('keeps two authenticated profiles separate and preserves offline work when switching accounts', async ({ browser, request }) => {
  test.skip(!process.env.COJUDGE_SYNC_E2E, 'Run with the isolated server-progress config.');
  const ownerBefore = await (await request.get('/api/server-progress')).json();
  const ownerHeaders = { 'X-CoJudge-User': 'musel', 'X-CoJudge-Profile': 'musel' };
  const sisterHeaders = { 'X-CoJudge-User': 'alessa', 'X-CoJudge-Profile': 'alessa' };
  const assetTraversal = await request.get('/api/problems/..%2Fprogress/asset/current.json', { headers: sisterHeaders });
  expect(assetTraversal.ok()).toBe(false);
  const sisterBefore = await (await request.get('/api/server-progress', { headers: sisterHeaders })).json();
  expect(sisterBefore.revision).toBe(0);
  expect(sisterBefore.data.files).toEqual({});
  const sisterSave = await request.put('/api/server-progress', { headers: { ...sisterHeaders, Origin: 'http://localhost:4175', 'X-CoJudge-Sync': '1' }, data: { baseRevision: 0, data: { solutions: { alessa: 'Alessa solution' }, 'user-checkboxes': { 'basic-max-of-three': true } } } });
  expect(sisterSave.ok()).toBeTruthy();
  const denied = await request.get('/api/server-progress', { headers: { ...sisterHeaders, 'X-CoJudge-Profile': 'musel' } });
  expect(denied.status()).toBe(403);
  const rejectedWrite = await request.put('/api/server-progress', { headers: { ...sisterHeaders, 'X-CoJudge-Profile': 'musel', Origin: 'http://localhost:4175', 'X-CoJudge-Sync': '1' }, data: { baseRevision: 1, data: ownerBefore.data } });
  expect(rejectedWrite.status()).toBe(403);
  expect((await (await request.get('/api/server-progress')).json()).data).toEqual(ownerBefore.data);

  const context = await browser.newContext({ extraHTTPHeaders: ownerHeaders });
  const page = await context.newPage();
  await page.goto('http://localhost:4175/');
  await expect(page.getByLabel('Current profile')).toHaveText('Müsel');
  await expect(page.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => { const solutions = JSON.parse(localStorage.getItem('solutions') || '{}'); solutions.offlineOwner = 'offline owner work'; localStorage.setItem('solutions', JSON.stringify(solutions)); });
  // Change authentication and reload before the pending owner edit can save.
  await context.setExtraHTTPHeaders(sisterHeaders);
  await context.setOffline(false);
  await page.goto('http://localhost:4175/');
  await expect(page.getByLabel('Current profile')).toHaveText('Alessa');
  await expect(page.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('solutions')!))).toEqual({ alessa: 'Alessa solution' });
  expect((await (await request.get('/api/server-progress', { headers: sisterHeaders })).json()).data.solutions).toEqual({ alessa: 'Alessa solution' });
  await context.setExtraHTTPHeaders(ownerHeaders);
  await page.goto('http://localhost:4175/');
  await expect(page.getByLabel('Current profile')).toHaveText('Müsel');
  await expect(page.getByRole('button', { name: '✓ Saved to VPS', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('solutions')!).offlineOwner)).toBe('offline owner work');
  expect((await (await request.get('/api/server-progress')).json()).data.solutions.offlineOwner).toBe('offline owner work');
  await context.close();
});
