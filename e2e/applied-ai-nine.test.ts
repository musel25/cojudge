import { expect, test } from '@playwright/test';

const slugs = [
  'ai-01-clean-documents',
  'ai-02-split-documents',
  'ai-03-find-similar-documents',
  'ai-04-build-context',
  'ai-05-validate-extracted-tasks',
  'ai-06-check-citations',
  'ai-07-evaluate-search',
  'ai-08-cache-embeddings',
  'ai-09-retry-failed-requests'
];

for (const width of [1280, 390]) {
  test(`Applied AI lists nine ordered problems and opens an unfinished Python starter (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?course=applied-ai-nine');
    const collapsed = page.locator('.group-header[aria-expanded="false"]');
    while (await collapsed.count()) await collapsed.first().click();
    const links = page.locator('a[href^="/problems/ai-"]');
    await expect(links).toHaveCount(9);
    expect(await links.evaluateAll(elements => elements.map(element => element.getAttribute('href'))))
      .toEqual(slugs.map(slug => `/problems/${slug}`));
    await links.first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Clean documents/i);
    await expect(page.getByLabel('Language', { exact: true })).toHaveValue('python');
    await expect(page.locator('.monaco-editor').first()).toContainText('def solve');
    await expect(page.locator('.monaco-editor').first()).toContainText('NotImplementedError');
    await expect(page.getByRole('button', { name: /^Reference Solution/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
