import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Ensures homepage agent creation lands on the new chat page without a transient 404.
 */
test.describe('new agent redirect', () => {
    test('opens the newly created agent chat immediately from the homepage', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        await page.getByText('+ Add New Agent', { exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Create New Agent' })).toBeVisible();

        await page.getByRole('button', { name: 'Create Agent' }).click();

        await expect(page).toHaveURL(/\/agents\/[^/]+\/chat\?chat=new$/);
        await expect(page.getByText('Agent Not Found :(')).toHaveCount(0);
        await expect(page.locator('textarea.chat-input-textarea')).toBeVisible();
    });
});
