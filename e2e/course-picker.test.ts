import { expect, test } from '@playwright/test';

test('finds a list and opens it with the keyboard', async ({ page }) => {
  await page.goto('/?course=blind75');
  const picker = page.getByRole('button', { name: /Choose a list\. Current list:/ });
  await picker.click();
  const search = page.getByRole('searchbox', { name: 'Find a list' });
  await expect(search).toBeFocused();
  await search.fill('NeetCode 150');
  const courses = page.getByRole('navigation', { name: 'Course', exact: true });
  await expect(courses.getByRole('link')).toHaveCount(1);
  await search.press('ArrowDown');
  await expect(courses.getByRole('link', { name: 'NeetCode 150', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/course=nc150/);
  await expect(picker).toContainText('NeetCode 150');
  await expect(page.getByRole('dialog', { name: 'Choose a list', exact: true })).toHaveCount(0);
  await picker.click();
  await page.getByRole('searchbox', { name: 'Find a list' }).press('Escape');
  await expect(picker).toBeFocused();
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
});

test('keeps list visibility preferences after a reload', async ({ page }) => {
  await page.goto('/?course=blind75');
  const picker = page.getByRole('button', { name: /Choose a list\. Current list:/ });
  await picker.click();
  await page.getByRole('button', { name: 'Manage lists', exact: true }).click();
  await page.getByRole('checkbox', { name: 'NeetCode 150', exact: true }).uncheck();
  await page.reload();
  await picker.click();
  await page.getByRole('searchbox', { name: 'Find a list' }).fill('NeetCode 150');
  await expect(page.getByText('No lists match “NeetCode 150”.')).toBeVisible();
  await page.getByRole('button', { name: 'Manage lists', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'NeetCode 150', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Reset to default', exact: true }).click();
  await page.getByRole('button', { name: 'Back to lists', exact: false }).click();
  await expect(page.getByRole('link', { name: 'NeetCode 150', exact: true })).toBeVisible();
});
