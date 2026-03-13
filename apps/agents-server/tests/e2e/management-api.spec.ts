import type { Page } from '@playwright/test';
import { expect, test } from 'playwright/test';
import { loginAsAdmin } from './support/auth';

/**
 * Request payload accepted by the browser-side management API helper.
 */
type BrowserApiRequest = {
    path: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    token: string;
    body?: unknown;
};

/**
 * Executes one authenticated management API request from the browser context.
 *
 * @param request - Browser-side request description.
 * @returns Response status and parsed JSON body.
 */
async function callManagementApi(page: Page, request: BrowserApiRequest): Promise<{ status: number; body: unknown }> {
    return page.evaluate(async ({ path, method = 'GET', token, body }) => {
        const response = await fetch(path, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        return {
            status: response.status,
            body: (await response.json()) as unknown,
        };
    }, request);
}

/**
 * Management API integration coverage for the first public release surface.
 */
test.describe('Agents Server management API', () => {
    test('supports OpenAPI docs and owner-scoped CRUD flows', async ({ page }) => {
        await page.goto('/');
        await loginAsAdmin(page);

        const createdToken = await page.evaluate(async () => {
            const response = await fetch('/api/api-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note: 'E2E management API',
                }),
            });

            return {
                status: response.status,
                body: (await response.json()) as { token?: string },
            };
        });

        expect(createdToken.status).toBe(200);
        expect(createdToken.body.token).toMatch(/^ptbk_/);
        const apiKey = createdToken.body.token as string;

        const openApiResponse = await callManagementApi(page, {
            path: '/openapi.json',
            token: apiKey,
        });
        expect(openApiResponse.status).toBe(200);
        expect(openApiResponse.body).toMatchObject({
            openapi: expect.stringMatching(/^3\./),
            paths: expect.objectContaining({
                '/api/v1/agents': expect.any(Object),
                '/api/v1/folders': expect.any(Object),
                '/api/v1/me': expect.any(Object),
                '/api/v1/instance': expect.any(Object),
            }),
        });

        await page.goto('/swagger');
        await expect(page.getByRole('heading', { name: 'Management API Explorer' })).toBeVisible();
        await expect(page.getByText('Promptbook Agents Server Management API')).toBeVisible();
        await expect(page.locator(`input[value="${apiKey}"]`)).toBeVisible();

        const meResponse = await callManagementApi(page, {
            path: '/api/v1/me',
            token: apiKey,
        });
        expect(meResponse.status).toBe(200);
        expect(meResponse.body).toMatchObject({
            userId: expect.any(Number),
            username: 'admin',
            apiKey: {
                note: 'E2E management API',
            },
        });

        const instanceResponse = await callManagementApi(page, {
            path: '/api/v1/instance',
            token: apiKey,
        });
        expect(instanceResponse.status).toBe(200);
        expect(instanceResponse.body).toMatchObject({
            managementApiBasePath: '/api/v1',
            openApiUrl: expect.stringContaining('/openapi.json'),
            swaggerUrl: expect.stringContaining('/swagger'),
        });

        const createFolderResponse = await callManagementApi(page, {
            path: '/api/v1/folders',
            method: 'POST',
            token: apiKey,
            body: {
                name: 'E2E Support Folder',
                color: '#1d4ed8',
                icon: 'folder',
            },
        });
        expect(createFolderResponse.status).toBe(201);
        expect(createFolderResponse.body).toMatchObject({
            folder: {
                id: expect.any(Number),
                name: 'E2E Support Folder',
            },
        });
        const folderId = (createFolderResponse.body as { folder: { id: number } }).folder.id;

        const createAgentResponse = await callManagementApi(page, {
            path: '/api/v1/agents',
            method: 'POST',
            token: apiKey,
            body: {
                source: 'E2E Support Agent\nPERSONA You help with support tickets.\nRULE Keep replies concise.',
                visibility: 'UNLISTED',
            },
        });
        expect(createAgentResponse.status).toBe(201);
        expect(createAgentResponse.body).toMatchObject({
            agent: {
                id: expect.any(String),
                agentName: 'e2e-support-agent',
                displayName: 'E2E Support Agent',
                links: {
                    profileUrl: expect.stringContaining('/agents/'),
                    chatUrl: expect.stringContaining('/chat'),
                },
            },
        });
        const agentId = (createAgentResponse.body as { agent: { id: string } }).agent.id;

        const moveAgentResponse = await callManagementApi(page, {
            path: `/api/v1/folders/${folderId}/agents/${agentId}`,
            method: 'POST',
            token: apiKey,
        });
        expect(moveAgentResponse.status).toBe(200);
        expect(moveAgentResponse.body).toMatchObject({
            agent: {
                folderId,
            },
        });

        const listAgentsResponse = await callManagementApi(page, {
            path: '/api/v1/agents?q=support&sort=relevance:desc',
            token: apiKey,
        });
        expect(listAgentsResponse.status).toBe(200);
        expect(listAgentsResponse.body).toMatchObject({
            items: expect.arrayContaining([
                expect.objectContaining({
                    id: agentId,
                    folderId,
                }),
            ]),
            pagination: {
                total: 1,
            },
        });

        const detailResponse = await callManagementApi(page, {
            path: `/api/v1/agents/${agentId}`,
            token: apiKey,
        });
        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body).toMatchObject({
            id: agentId,
            source: expect.stringContaining('PERSONA'),
            links: {
                profileUrl: expect.stringContaining(agentId),
                chatUrl: expect.stringContaining(agentId),
            },
        });

        const updateResponse = await callManagementApi(page, {
            path: `/api/v1/agents/${agentId}`,
            method: 'PATCH',
            token: apiKey,
            body: {
                name: 'E2E Support Agent Updated',
                source: 'Placeholder\nPERSONA You help with escalations.\nRULE Provide next steps.',
                visibility: 'PUBLIC',
            },
        });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body).toMatchObject({
            agent: {
                id: agentId,
                agentName: 'e2e-support-agent-updated',
                displayName: 'E2E Support Agent Updated',
                visibility: 'PUBLIC',
                source: expect.stringContaining('escalations'),
            },
        });

        const deleteResponse = await callManagementApi(page, {
            path: `/api/v1/agents/${agentId}`,
            method: 'DELETE',
            token: apiKey,
        });
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toEqual({ success: true });

        const deleteFolderResponse = await callManagementApi(page, {
            path: `/api/v1/folders/${folderId}`,
            method: 'DELETE',
            token: apiKey,
        });
        expect(deleteFolderResponse.status).toBe(200);
        expect(deleteFolderResponse.body).toEqual({ success: true });
    });
});
