import { expect, test } from 'playwright/test';
import { loginAsAdmin, logoutFromHeader } from './support/auth';
import { openHeaderMenu } from './support/navigation';

/**
 * Core authentication and navigation integration flows for Agents Server.
 */
test.describe('Agents Server authentication and navigation', () => {
    test('shows forbidden state for protected System page when anonymous', async ({ page }) => {
        await page.goto('/system/profile');
        await expect(page.getByRole('heading', { name: '403 Forbidden' })).toBeVisible();
        await expect(page.getByLabel('Username')).toBeVisible();
    });

    test('allows admin to sign in, navigate major menus, and sign out', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: 'Promptbook Agents Server' })).toBeVisible();

        await loginAsAdmin(page);
        await expect(page.getByRole('button', { name: 'System' })).toBeVisible();

        await openHeaderMenu(page, 'Documentation');
        await page.getByRole('link', { name: 'Overview' }).click();
        await expect(page).toHaveURL(/\/docs$/);
        await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();

        await page.goto('/docs/PERSONA');
        await expect(page.getByRole('heading', { name: 'PERSONA', exact: true })).toBeVisible();

        await openHeaderMenu(page, 'System');
        await page.getByRole('link', { name: 'Profile' }).click();
        await expect(page).toHaveURL(/\/system\/profile$/);
        await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

        await openHeaderMenu(page, 'System');
        await page.getByRole('link', { name: 'User Memory' }).click();
        await expect(page).toHaveURL(/\/system\/user-memory$/);
        await expect(page.getByRole('heading', { name: 'User Memory' })).toBeVisible();

        await logoutFromHeader(page);
    });
});
