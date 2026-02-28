import { expect, test, type Page } from 'playwright/test';
import { loginAsAdmin, logoutFromHeader } from './support/auth';
import { openHeaderMenu } from './support/navigation';

/**
 * Emulates a coarse-pointer touch environment while keeping desktop viewport width.
 *
 * @param page - Current Playwright page.
 */
async function emulateTouchInput(page: Page) {
    await page.addInitScript(() => {
        const originalMatchMedia = window.matchMedia.bind(window);

        Object.defineProperty(navigator, 'maxTouchPoints', {
            configurable: true,
            get: () => 5,
        });

        Object.defineProperty(window, 'ontouchstart', {
            configurable: true,
            value: null,
        });

        window.matchMedia = (query: string): MediaQueryList => {
            if (query === '(hover: none) and (pointer: coarse)') {
                return {
                    matches: true,
                    media: query,
                    onchange: null,
                    addListener: () => void 0,
                    removeListener: () => void 0,
                    addEventListener: () => void 0,
                    removeEventListener: () => void 0,
                    dispatchEvent: () => false,
                } as MediaQueryList;
            }

            return originalMatchMedia(query);
        };
    });
}

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

    test('keeps nested header submenu items tappable on touch devices', async ({ page }) => {
        await emulateTouchInput(page);
        await page.goto('/');

        await loginAsAdmin(page);
        await openHeaderMenu(page, 'Documentation');

        const allSubmenuButton = page.getByRole('button', { name: /^All$/ });
        await expect(allSubmenuButton).toBeVisible();
        await allSubmenuButton.click();

        const personaLink = page.getByRole('link', { name: /^PERSONA\b/ });
        await expect(personaLink).toBeVisible();
        await personaLink.click();

        await expect(page).toHaveURL(/\/docs\/PERSONA$/);
        await expect(page.getByRole('heading', { name: 'PERSONA', exact: true })).toBeVisible();
    });
});
