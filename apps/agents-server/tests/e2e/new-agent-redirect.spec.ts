import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Metadata key controlling the new-agent creation experience.
 */
const NEW_AGENT_WIZARD_METADATA_KEY = 'NEW_AGENT_WIZARD';

/**
 * Default manGo wizard metadata value.
 */
const MANGO_WIZARD_MODE = 'MANGO_WIZARD';

/**
 * Legacy editor metadata value used by this redirect coverage.
 */
const BOILERPLATE_MODE = 'BOILERPLATE';

/**
 * Note persisted with the e2e metadata override.
 */
const NEW_AGENT_WIZARD_E2E_NOTE = 'Temporary e2e override for new-agent redirect coverage.';

/**
 * Minimal metadata row shape returned by the metadata API.
 */
type MetadataEntry = {
    readonly key: string;
};

/**
 * Result returned from a metadata API mutation run in the browser context.
 */
type MetadataMutationResult = {
    readonly status: number;
    readonly body: unknown;
};

/**
 * Sets the new-agent wizard metadata value through the admin API.
 *
 * @param page - Current Playwright page.
 * @param mode - Metadata value to persist.
 */
async function setNewAgentWizardMode(page: Parameters<typeof loginAsAdmin>[0], mode: string): Promise<void> {
    const result = await page.evaluate(
        async ({ key, value, note }): Promise<MetadataMutationResult> => {
            const metadataResponse = await fetch('/api/metadata');
            const metadata = (await metadataResponse.json()) as MetadataEntry[];
            const isExistingEntryPersisted = metadata.some((entry) => entry.key === key);
            const response = await fetch('/api/metadata', {
                method: isExistingEntryPersisted ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value, note }),
            });

            return {
                status: response.status,
                body: await response.json().catch(() => null),
            };
        },
        {
            key: NEW_AGENT_WIZARD_METADATA_KEY,
            value: mode,
            note: NEW_AGENT_WIZARD_E2E_NOTE,
        },
    );

    expect(result.status, JSON.stringify(result.body)).toBeLessThan(300);
}

/**
 * Ensures homepage agent creation lands on the new chat page without a transient 404.
 */
test.describe('new agent redirect', () => {
    test('opens the newly created agent chat immediately from the homepage', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);
        await setNewAgentWizardMode(page, BOILERPLATE_MODE);

        try {
            await page.reload();
            await page.getByText('+ Add New Agent', { exact: true }).click();
            await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible();

            await page.getByRole('button', { name: 'Create Agent' }).click();

            await expect(page).toHaveURL(/\/agents\/[^/]+\/chat\?chat=new$/);
            await expect(page.getByText('Agent Not Found :(')).toHaveCount(0);
            await expect(page.locator('textarea.chat-input-textarea')).toBeVisible();
        } finally {
            await setNewAgentWizardMode(page, MANGO_WIZARD_MODE);
        }
    });
});
