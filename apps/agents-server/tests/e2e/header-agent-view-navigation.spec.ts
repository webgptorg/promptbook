import { expect, test, type Page } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Minimal management-agent payload needed by header navigation regression coverage.
 */
type ManagementAgent = {
    /**
     * Canonical agent slug used in URLs.
     */
    readonly agentName: string;
};

/**
 * Escapes one literal string so it can be embedded into a `RegExp`.
 *
 * @param value - Raw literal value.
 * @returns Escaped literal text.
 */
function escapeForRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                note: 'E2E header agent-view navigation',
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
            const source = `${displayName}\nPERSONA You help with header navigation regression tests.\nRULE Keep replies concise.`;
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

test.describe('header agent-view navigation', () => {
    test('navigates between profile and chat from the active agent breadcrumb menu', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await createManagementApiToken(page);
        const agent = await createTestAgent(page, apiKey, 'E2E Header Agent View Navigation');
        const escapedAgentName = escapeForRegExp(agent.agentName);
        const header = page.getByRole('banner');

        await page.goto(`/agents/${encodeURIComponent(agent.agentName)}/chat`);

        await header.getByRole('button', { name: 'Chat', exact: true }).click();
        await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Profile', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/agents/${escapedAgentName}$`));

        await header.getByRole('button', { name: 'Profile', exact: true }).click();
        await expect(page.getByRole('link', { name: 'Chat', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Chat', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/agents/${escapedAgentName}/chat(?:\\?|$)`));
    });
});
