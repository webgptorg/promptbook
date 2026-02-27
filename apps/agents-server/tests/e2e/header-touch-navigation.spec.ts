import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';
import { openHeaderMenu } from './support/navigation';

/**
 * Touch-first navigation regressions for desktop-width header dropdowns.
 */
test.describe('Agents Server header touch navigation', () => {
    test.use({
        hasTouch: true,
        viewport: { width: 1366, height: 900 },
    });

    test('keeps top-level dropdown open while expanding nested touch submenu entries', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        await openHeaderMenu(page, 'Documentation');
        await page.getByRole('button', { name: 'All', exact: true }).click();
        await page.getByRole('link', { name: 'PERSONA' }).click();

        await expect(page).toHaveURL(/\/docs\/PERSONA$/);
        await expect(page.getByRole('heading', { name: 'PERSONA', exact: true })).toBeVisible();
    });
});
