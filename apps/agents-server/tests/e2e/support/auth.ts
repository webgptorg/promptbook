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
 * Maximum retries while waiting for the login dialog to become interactive.
 */
const LOGIN_DIALOG_OPEN_RETRIES = 3;

/**
 * Opens the login dialog from the header.
 *
 * @param page - Current Playwright page.
 */
export async function openLoginDialog(page: Page): Promise<void> {
    const loginButton = page.getByRole('button', { name: 'Log in' });
    await expect(loginButton).toBeVisible();

    let lastError: unknown = null;
    for (let attempt = 0; attempt < LOGIN_DIALOG_OPEN_RETRIES; attempt++) {
        await loginButton.click();
        try {
            await expect(page.getByLabel('Username')).toBeVisible({ timeout: 4_000 });
            await expect(page.getByLabel('Password')).toBeVisible({ timeout: 4_000 });
            return;
        } catch (error) {
            lastError = error;
            await page.waitForTimeout(300);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Login dialog did not become interactive.');
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
    await expect(page.getByRole('button', { name: /admin/i })).toBeVisible();
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
