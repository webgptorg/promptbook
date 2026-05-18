import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';
import { AgentManagementApi } from './support/AgentManagementApi';

/**
 * Note stored with management API tokens created for header agent-view navigation coverage.
 */
const HEADER_AGENT_VIEW_API_TOKEN_NOTE = 'E2E header agent-view navigation';

/**
 * Persona used by deterministic header agent-view navigation test agents.
 */
const HEADER_AGENT_VIEW_PERSONA = 'You help with header navigation regression tests.';

/**
 * Escapes one literal string so it can be embedded into a `RegExp`.
 *
 * @param value - Raw literal value.
 * @returns Escaped literal text.
 */
function escapeForRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('header agent-view navigation', () => {
    test('navigates between profile and chat from the active agent breadcrumb menu', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const apiKey = await AgentManagementApi.createManagementApiToken(page, HEADER_AGENT_VIEW_API_TOKEN_NOTE);
        const agent = await AgentManagementApi.createTestAgent(page, apiKey, {
            label: 'E2E Header Agent View Navigation',
            persona: HEADER_AGENT_VIEW_PERSONA,
        });
        const escapedAgentId = escapeForRegExp(agent.agentId);
        const header = page.getByRole('banner');

        await page.goto(`/agents/${encodeURIComponent(agent.agentId)}/chat`);

        await header.getByRole('button', { name: 'Chat', exact: true }).click();
        await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Profile', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/agents/${escapedAgentId}$`));

        await header.getByRole('button', { name: 'Profile', exact: true }).click();
        await expect(page.getByRole('link', { name: 'Chat', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Chat', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/agents/${escapedAgentId}/chat(?:\\?|$)`));
    });
});
