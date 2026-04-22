import { expect, type Locator, type Page } from 'playwright/test';

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
    const inlineLoginButton = page.getByRole('banner').getByRole('button', { name: 'Log in' });
    let loginButton: Locator = inlineLoginButton;

    if (!(await inlineLoginButton.isVisible().catch(() => false))) {
        const mobileMenuButton = page.getByRole('banner').getByRole('button', { name: 'Menu' });
        await expect(mobileMenuButton).toBeVisible();
        await mobileMenuButton.click();

        loginButton = page.getByRole('navigation', { name: 'Menu' }).getByRole('button', { name: 'Log in' });
    }

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

    const desktopAdminButton = page.getByRole('button', { name: /admin/i });
    if (await desktopAdminButton.isVisible().catch(() => false)) {
        return;
    }

    const mobileMenuButton = page.getByRole('banner').getByRole('button', { name: 'Menu' });
    if (await mobileMenuButton.isVisible().catch(() => false)) {
        await mobileMenuButton.click();

        const mobileNavigation = page.getByRole('navigation', { name: 'Menu' });
        await expect(mobileNavigation.getByRole('button', { name: 'Log out' })).toBeVisible();

        await mobileMenuButton.click();
        await expect(mobileNavigation).toBeHidden();
        return;
    }

    await expect(desktopAdminButton).toBeVisible();
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
