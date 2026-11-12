import { expect, test } from '@playwright/test';

test('continues in order, opens a hidden course, and preserves saved progress', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('user-checkboxes', JSON.stringify({
            'pybites-oop-exercise-1': true, 'pybites-oop-exercise-2': true,
            'pybites-pytest-exercise-1': true
        }));
        localStorage.setItem('course-visibility', JSON.stringify({ 'pybites-pytest': false }));
    });
    await page.goto('/?course=blind75');
    const chooser = page.getByRole('button', { name: /Choose a list\. Current list:/ });
    if (await chooser.count()) await chooser.click();
    await expect(page.getByRole('navigation', { name: 'Course', exact: true }).getByText('Pybites pytest Path')).toHaveCount(0);
    if (await chooser.count()) await chooser.click();
    await page.getByRole('button', { name: 'Learning path', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Your Python learning path' });
    await expect(panel.getByText('3 / 16 exercises complete')).toBeVisible();
    await expect(panel.getByRole('link', { name: 'OOP Complete', exact: true })).toBeVisible();
    await expect(panel.getByText('Not available', { exact: true })).toHaveCount(1);
    await expect(panel.getByRole('link', { name: /Decorators/ })).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Search problems' }).fill('no match');
    await panel.getByRole('link', { name: 'Continue with Pytest', exact: true }).click();
    await expect(page).toHaveURL(/course=pybites-pytest/);
    await expect(page.getByRole('textbox', { name: 'Search problems' })).toHaveValue('');
    await expect(panel.getByRole('link', { name: 'Pytest 1 / 2 complete Up next', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.overall-count')).toContainText('1 / 2');
    if (await chooser.count()) await chooser.click();
    await expect(page.getByRole('navigation', { name: 'Course', exact: true }).getByRole('link', { name: 'Pybites pytest Path' })).toHaveAttribute('aria-current', 'page');
    if (await chooser.count()) await chooser.click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('user-checkboxes') || '{}'))).toEqual({
        'pybites-oop-exercise-1': true, 'pybites-oop-exercise-2': true,
        'pybites-pytest-exercise-1': true
    });
    await page.screenshot({ path: '/tmp/cojudge-learning-path-desktop.png', fullPage: true });
});

test('shows completion for available courses and closes with Escape', async ({ page }) => {
    await page.addInitScript(() => {
        const names = ['oop', 'pytest', 'data-formats', 'collections', 'fastapi', 'sqlmodel', 'datetimes-timezones', 'typer'];
        const solved = Object.fromEntries(names.flatMap((name) => [1, 2].map((n) => [`pybites-${name}-exercise-${n}`, true])));
        localStorage.setItem('user-checkboxes', JSON.stringify(solved));
    });
    await page.goto('/?course=blind75');
    const toggle = page.getByRole('button', { name: 'Learning path', exact: true });
    await toggle.click();
    const panel = page.getByRole('region', { name: 'Your Python learning path' });
    await expect(panel.getByText('16 / 16 exercises complete')).toBeVisible();
    await expect(panel.getByText('All available courses complete')).toBeVisible();
    await expect(panel.getByRole('link', { name: /Continue with/ })).toHaveCount(0);
    await panel.getByRole('link', { name: 'OOP Complete', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('fits a small screen in both themes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?course=blind75');
    await page.getByRole('button', { name: 'Learning path', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Your Python learning path' });
    await expect(panel.getByRole('heading', { name: 'Build real applications' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const theme of ['light', 'dark']) {
        await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
        await panel.screenshot({ path: `/tmp/cojudge-learning-path-mobile-${theme}.png` });
    }
});
