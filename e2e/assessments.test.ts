import { expect, test } from '@playwright/test';

test('keeps future assessment levels locked and restores the timed attempt with its draft', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Assessments', exact: true }).click();
	await expect(page).toHaveURL(/\/assessments\/?$/);
	await page.getByRole('link', { name: 'Tool Lending Desk', exact: true }).click();
	await expect(page).toHaveURL(/\/assessments\/tool-lending-desk\/?$/);
	await expect(page.getByRole('button', { name: 'Start learning', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Start 90-minute assessment', exact: true }).click();

	const draft = page.locator('textarea[name="code"]');
	await expect(draft).toBeVisible();
	await expect(page.getByText('Level 1', { exact: true }).first()).toBeVisible();
	for (const level of [2, 3, 4]) {
		await expect(page.getByText(new RegExp(`^Level ${level}\\s*[·:-]?\\s*Locked$`, 'i'))).toBeVisible();
	}

	const code = '# Draft from a timed assessment\nclass LendingDesk:\n    pass\n';
	await draft.fill(code);
	await page.getByRole('button', { name: 'Save draft', exact: true }).click();
	await expect(page.getByText('Draft saved', { exact: false })).toBeVisible();

	const response = await page.reload();
	expect(response?.ok()).toBe(true);
	const initialHtml = await response!.text();
	for (const hiddenDetail of ['Stock Summaries', 'Scheduled Holds', 'Catalog History', 'top_tools', 'schedule_hold', 'tool_at', 'duplicate-preserves-both-fields']) {
		expect(initialHtml).not.toContain(hiddenDetail);
	}
	await expect(draft).toHaveValue(code);
	await expect(page.getByRole('heading', { name: 'Attempt history', exact: true })).toBeVisible();
	await expect(page.getByText('90-minute assessment', { exact: true }).first()).toBeVisible();
});

test('checks the unlocked requirements in learning mode', async ({ page }) => {
	await page.goto('/assessments/tool-lending-desk');
	await page.getByRole('button', { name: 'Start learning', exact: true }).click();
	const practice = page.getByRole('form', { name: 'Requirements comprehension' });
	await expect(practice).toBeVisible();
	await practice.getByRole('radio', { name: 'The tool ID must exist and units must be greater than zero.' }).check();
	await practice.getByRole('radio', { name: 'Both category and units.' }).check();
	await practice.getByRole('radio', { name: 'False', exact: true }).check();
	await practice.getByRole('radio', { name: 'The update succeeds and returns True.' }).check();
	await practice.getByRole('button', { name: 'Check requirements' }).click();
	await expect(practice.getByRole('status')).toHaveText('4 of 4 correct');
	await expect(page.getByText('Level 2 · Locked', { exact: true })).toBeVisible();
});

test('lists all four bundled assessments', async ({ page }) => {
	await page.goto('/assessments');
	const list = page.getByRole('main').getByRole('list');
	for (const title of ['Tool Lending Desk', 'Community Workshop', 'Bike Repair Desk', 'Returns Receiving']) {
		await expect(list.getByRole('link', { name: title, exact: true })).toBeVisible();
	}
});
