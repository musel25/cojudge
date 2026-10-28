import { expect, test } from '@playwright/test';

test('custom exercise shows its task, real examples, and actual sample check', async ({ page }) => {
    await page.goto('/problems/presentation-vehicle');
    await expect(page.getByRole('heading', { name: 'Subclassing: Vehicles in Motion', exact: true })).toHaveCount(1);
    await expect(page.getByText('Practice creating Python subclasses with', { exact: false })).toBeVisible();
    await expect(page.locator('.markdown-body code').filter({ hasText: '<brand> <model> with <wheels> wheels' })).toBeVisible();
    await expect(page.locator('.example-input')).toContainText('Car("Toyota", "Corolla", 4, 4).description()');
    await expect(page.locator('.example-output')).toContainText('Toyota Corolla with 4 wheels');
    await expect(page.getByRole('region', { name: 'Test details' })).toContainText('assert vehicle.description() == "Toyota Corolla with 4 wheels"');
    await expect(page.locator('.case-inputs textarea')).toHaveCount(0);
    await expect(page.getByText('Keep the supplied tests and runner unchanged.', { exact: true })).not.toBeVisible();
    await page.locator('summary').filter({ hasText: 'Course help' }).click();
    await expect(page.getByText('Keep the supplied tests and runner unchanged.', { exact: true })).toBeVisible();
});

test('ordinary coding problems keep their editable inputs', async ({ page }) => {
    await page.goto('/problems/two-sum');
    await expect(page.locator('.case-inputs textarea').first()).toBeVisible();
    await page.locator('.case-inputs textarea').first().fill('[1,2,3]');
    await expect(page.locator('.case-inputs textarea').first()).toHaveValue('[1,2,3]');
    await expect(page.getByRole('region', { name: 'Test details' })).toHaveCount(0);
});

test('adding a supplied check keeps its selector editable', async ({ page }) => {
    await page.goto('/problems/presentation-vehicle');
    await page.getByRole('button', { name: 'Add test case', exact: true }).click();
    const input = page.locator('.case-inputs textarea').first();
    await expect(input).toBeVisible();
    await input.fill('{"test":"test_another_check"}');
    await expect(input).toHaveValue('{"test":"test_another_check"}');
    await page.getByRole('button', { name: 'Reset to original sample test cases' }).click();
    await expect(page.getByRole('region', { name: 'Test details' })).toContainText('assert vehicle.description()');
});

test('run and submit show assertion values with the failed test detail', async ({ page }) => {
    const result = {
        payload: '{"test":"test_vehicle"}', output: "'x y with 2 wheels goes Vroom vroom!'",
        correctAnswer: "'A loud bike goes Vroom vroom!'", isCorrect: false, error: null, logs: '',
        failureDetail: 'FAILED test_rev_engine_reuses_description | AssertionError | test line 57: assert bike.rev_engine() == "A loud bike goes Vroom vroom!"',
    };
    await page.route('**/api/image/status?*', route => route.fulfill({ json: { docker: true, present: true } }));
    for (const endpoint of ['run', 'submit']) {
        await page.route(`**/api/${endpoint}*`, route => route.fulfill({
            json: route.request().method() === 'POST' ? { jobId: 'assertion-result' } : {
                ready: true, accepted: false, totalTc: 1, passedTc: 1, results: [result],
            },
        }));
    }
    await page.goto('/problems/presentation-vehicle');
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    const run = page.locator('.output-view');
    await expect(run).toContainText(result.failureDetail);
    await expect(run.locator('.result-output').filter({ hasText: result.output })).toBeVisible();
    await expect(run.locator('.result-output').filter({ hasText: result.correctAnswer })).toBeVisible();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    const submission = page.locator('.submission-view');
    await expect(submission).toContainText(result.failureDetail);
    await expect(submission.locator('.outputs')).toContainText(result.output);
    await expect(submission.locator('.outputs')).toContainText(result.correctAnswer);
    await expect(submission.locator('.outputs')).not.toContainText('passed');
    await page.getByRole('button', { name: 'Use Test Case', exact: true }).click();
    await page.getByRole('button', { name: 'Add test case', exact: true }).click();
    await expect(page.locator('.case-inputs textarea')).not.toContainText('FAILED');
});
