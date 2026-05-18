import { expect, test, type Locator, type Page } from 'playwright/test';
import { loginAsAdmin } from './support/auth';
import { AgentManagementApi } from './support/AgentManagementApi';

/**
 * Note stored with management API tokens created for header homepage navigation coverage.
 */
const HEADER_HOMEPAGE_API_TOKEN_NOTE = 'E2E header homepage navigation';

/**
 * Persona used by deterministic header homepage navigation test agents.
 */
const HEADER_HOMEPAGE_PERSONA = 'You help with homepage navigation regression tests.';

/**
 * Accessible label exposed by the shared homepage branding link in the header and mobile drawer.
 */
const HOMEPAGE_BRANDING_LINK_NAME = 'Promptbook Agents Server';

/**
 * Mobile viewport used to exercise the compact header and drawer interactions.
 */
const MOBILE_VIEWPORT_SIZE = {
    width: 390,
    height: 844,
};

/**
 * Switches the page to a mobile-sized viewport before loading the tested route.
 *
 * @param page - Current Playwright page.
 */
async function setMobileViewport(page: Page): Promise<void> {
    await page.setViewportSize(MOBILE_VIEWPORT_SIZE);
}

/**
 * Opens the mobile header drawer and returns its labeled navigation landmark.
 *
 * @param page - Current Playwright page.
 * @returns The opened mobile drawer navigation landmark.
 */
async function openMobileHeaderDrawer(page: Page): Promise<Locator> {
    const banner = page.getByRole('banner');
    const menuButton = banner.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const mobileNavigation = page.getByRole('navigation', { name: 'Menu' });
    await expect(mobileNavigation).toBeVisible();
    return mobileNavigation;
}

/**
 * Regression coverage for homepage navigation through the shared header branding.
 */
test.describe('header homepage navigation', () => {
    test('navigates to the homepage from the desktop header brand link', async ({ page }) => {
        await page.goto('/docs');

        const headerHomepageLink = page.getByRole('banner').getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the compact header brand link on mobile', async ({ page }) => {
        await setMobileViewport(page);
        await page.goto('/docs');

        const headerHomepageLink = page.getByRole('banner').getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the desktop header brand link on an agent profile page', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await AgentManagementApi.createManagementApiToken(page, HEADER_HOMEPAGE_API_TOKEN_NOTE);
        const agent = await AgentManagementApi.createTestAgent(page, apiKey, {
            label: 'E2E Header Homepage Profile Navigation',
            persona: HEADER_HOMEPAGE_PERSONA,
        });

        await page.goto(`/agents/${encodeURIComponent(agent.agentId)}`);

        const headerHomepageLink = page.getByRole('banner').getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the mobile drawer server link on an agent profile page', async ({ page }) => {
        await setMobileViewport(page);
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await AgentManagementApi.createManagementApiToken(page, HEADER_HOMEPAGE_API_TOKEN_NOTE);
        const agent = await AgentManagementApi.createTestAgent(page, apiKey, {
            label: 'E2E Header Homepage Mobile Profile Navigation',
            persona: HEADER_HOMEPAGE_PERSONA,
        });

        await page.goto(`/agents/${encodeURIComponent(agent.agentId)}`);

        const mobileNavigation = await openMobileHeaderDrawer(page);
        await mobileNavigation.getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME }).click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('navigation', { name: 'Menu' })).toBeHidden();
    });

    test('navigates to the homepage from the mobile drawer server link', async ({ page }) => {
        await setMobileViewport(page);
        await page.goto('/docs');

        const mobileNavigation = await openMobileHeaderDrawer(page);
        await mobileNavigation.getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME }).click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('navigation', { name: 'Menu' })).toBeHidden();
    });
});
