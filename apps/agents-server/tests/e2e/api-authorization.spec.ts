import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * API authorization integration flows for Agents Server.
 */
test.describe('Agents Server API authorization', () => {
    test('returns unauthorized metadata API response for anonymous users', async ({ page }) => {
        await page.goto('/');
        const response = await page.evaluate(async () => {
            const metadataResponse = await fetch('/api/metadata');
            return {
                status: metadataResponse.status,
                body: (await metadataResponse.json()) as unknown,
            };
        });

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({ error: 'Unauthorized' });
    });

    test('allows admin metadata API access and blocks admin password changes through API', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const metadataResponse = await page.evaluate(async () => {
            const response = await fetch('/api/metadata');
            return {
                status: response.status,
                body: (await response.json()) as unknown,
            };
        });
        expect(metadataResponse.status).toBe(200);
        expect(metadataResponse.body).toEqual([]);

        const changePasswordResponse = await page.evaluate(async () => {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: 'e2e-admin-password',
                    newPassword: 'something-new',
                }),
            });

            return {
                status: response.status,
                body: (await response.json()) as unknown,
            };
        });
        expect(changePasswordResponse.status).toBe(403);
        expect(changePasswordResponse.body).toMatchObject({
            error: 'You cannot change the admin password. Please update the `ADMIN_PASSWORD` environment variable.',
        });
    });
});
