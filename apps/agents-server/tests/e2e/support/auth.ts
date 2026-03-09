import { expect, type Page } from 'playwright/test';

/**
 * Username of the built-in admin account used in e2e tests.
 */
export const E2E_ADMIN_USERNAME = 'admin';

/**
 * Password of the built-in admin account used in e2e tests.
 */
export const E2E_ADMIN_PASSWORD = 'e2e-admin-password';

/**
 * Opens the login dialog from the header.
 *
 * @param page - Current Playwright page.
 */
export async function openLoginDialog(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
}

/**
 * Authenticates as the e2e admin user through the UI.
 *
 * @param page - Current Playwright page.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await openLoginDialog(page);
    await page.getByLabel('Username').fill(E2E_ADMIN_USERNAME);
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByLabel('Password').press('Enter');
    await expect(page.getByLabel('Username')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Documentation' })).toBeVisible();
}

/**
 * Logs the current user out through the profile dropdown.
 *
 * @param page - Current Playwright page.
 */
export async function logoutFromHeader(page: Page): Promise<void> {
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('banner').getByRole('button', { name: 'Log in' })).toBeVisible();
}
