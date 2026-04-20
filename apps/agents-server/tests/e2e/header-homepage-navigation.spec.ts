import { expect, test, type Locator, type Page } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Minimal management-agent payload needed by homepage-navigation regression coverage.
 */
type ManagementAgent = {
    /**
     * Canonical agent slug used in URLs.
     */
    readonly agentName: string;
};

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
 * Creates one management API token for the authenticated browser session.
 *
 * @param page - Current Playwright page.
 * @returns Raw bearer token.
 */
async function createManagementApiToken(page: Page): Promise<string> {
    return page.evaluate(async () => {
        const response = await fetch('/api/api-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                note: 'E2E header homepage navigation',
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create management API token: ${response.status}`);
        }

        const payload = (await response.json()) as { token?: string };
        if (!payload.token) {
            throw new Error('Management API token response did not include `token`.');
        }

        return payload.token;
    });
}

/**
 * Creates one deterministic test agent through the management API.
 *
 * @param page - Current Playwright page.
 * @param apiKey - Bearer token used for the management API call.
 * @param label - Human-readable label used in the agent source.
 * @returns Canonical agent routing data.
 */
async function createTestAgent(page: Page, apiKey: string, label: string): Promise<ManagementAgent> {
    return page.evaluate(
        async ({ apiKey: token, label: displayName }) => {
            const source = `${displayName}\nPERSONA You help with homepage navigation regression tests.\nRULE Keep replies concise.`;
            const response = await fetch('/api/v1/agents', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source,
                    visibility: 'UNLISTED',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create test agent: ${response.status}`);
            }

            const payload = (await response.json()) as {
                agent?: {
                    agentName?: string;
                };
            };

            if (!payload.agent?.agentName) {
                throw new Error('Test agent response did not include the canonical agent name.');
            }

            return {
                agentName: payload.agent.agentName,
            };
        },
        { apiKey, label },
    );
}

/**
 * Regression coverage for homepage navigation through the shared header branding.
 */
test.describe('header homepage navigation', () => {
    test('navigates to the homepage from the desktop header brand link', async ({ page }) => {
        await page.goto('/docs');

        const headerHomepageLink = page
            .getByRole('banner')
            .getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the compact header brand link on mobile', async ({ page }) => {
        await setMobileViewport(page);
        await page.goto('/docs');

        const headerHomepageLink = page
            .getByRole('banner')
            .getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the desktop header brand link on an agent profile page', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Header Homepage Profile Navigation');

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);

        const headerHomepageLink = page
            .getByRole('banner')
            .getByRole('link', { name: HOMEPAGE_BRANDING_LINK_NAME });
        await expect(headerHomepageLink).toBeVisible();
        await headerHomepageLink.click();

        await expect(page).toHaveURL(/\/$/);
    });

    test('navigates to the homepage from the mobile drawer server link on an agent profile page', async ({ page }) => {
        await setMobileViewport(page);
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Header Homepage Mobile Profile Navigation');

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}`);

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
