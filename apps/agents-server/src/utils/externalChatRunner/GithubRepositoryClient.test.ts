import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createGithubFileIfMissing, upsertGithubFile } from './GithubRepositoryClient';

const ORIGINAL_FETCH = global.fetch;

/**
 * Shared configuration fixture for GitHub repository-client tests.
 */
const TEST_CONFIGURATION = {
    token: 'test-token',
    owner: 'promptbook',
    repositoryVisibility: 'private' as const,
};

afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    jest.restoreAllMocks();
});

describe('GithubRepositoryClient', () => {
    it('retries upserts after a stale SHA conflict and uses the refreshed SHA', async () => {
        global.fetch = jest
            .fn<typeof fetch>()
            .mockImplementationOnce(async () => createJsonResponse(200, createGithubFilePayload('README.md', 'sha-old', 'old')))
            .mockImplementationOnce(async () =>
                createJsonResponse(409, {
                    message: 'README.md is at sha-new but expected sha-old',
                }),
            )
            .mockImplementationOnce(async () => createJsonResponse(200, createGithubFilePayload('README.md', 'sha-new', 'old')))
            .mockImplementationOnce(async () => createJsonResponse(200, { content: { sha: 'sha-written' } }));

        const didWrite = await upsertGithubFile({
            configuration: TEST_CONFIGURATION,
            repositoryFullName: 'promptbook/agent-demo',
            path: 'README.md',
            content: 'new',
            message: 'Sync README',
        });

        expect(didWrite).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(4);
        expect(getJsonRequestBody(1)).toEqual(expect.objectContaining({ sha: 'sha-old' }));
        expect(getJsonRequestBody(3)).toEqual(expect.objectContaining({ sha: 'sha-new' }));
    });

    it('treats a stale SHA conflict as a no-op when the desired content is already present', async () => {
        global.fetch = jest
            .fn<typeof fetch>()
            .mockImplementationOnce(async () => createJsonResponse(200, createGithubFilePayload('agent.book', 'sha-old', 'before')))
            .mockImplementationOnce(async () =>
                createJsonResponse(409, {
                    message: 'agent.book is at sha-new but expected sha-old',
                }),
            )
            .mockImplementationOnce(async () => createJsonResponse(200, createGithubFilePayload('agent.book', 'sha-new', 'after')));

        const didWrite = await upsertGithubFile({
            configuration: TEST_CONFIGURATION,
            repositoryFullName: 'promptbook/agent-demo',
            path: 'agent.book',
            content: 'after',
            message: 'Sync agent source',
        });

        expect(didWrite).toBe(false);
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('leaves create-if-missing writes untouched when another worker creates the file first', async () => {
        global.fetch = jest
            .fn<typeof fetch>()
            .mockImplementationOnce(async () => createJsonResponse(404, { message: 'Not Found' }))
            .mockImplementationOnce(async () =>
                createJsonResponse(422, {
                    message: 'sha was not supplied because this file already exists',
                }),
            )
            .mockImplementationOnce(async () => createJsonResponse(200, createGithubFilePayload('.gitkeep', 'sha-existing', '')));

        const didWrite = await createGithubFileIfMissing({
            configuration: TEST_CONFIGURATION,
            repositoryFullName: 'promptbook/agent-demo',
            path: 'messages/queued/.gitkeep',
            content: '',
            message: 'Initialize queued messages',
        });

        expect(didWrite).toBe(false);
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });
});

/**
 * Creates one GitHub contents-style response payload.
 */
function createGithubFilePayload(path: string, sha: string, content: string): Record<string, unknown> {
    return {
        type: 'file',
        path,
        sha,
        encoding: 'base64',
        content: Buffer.from(content, 'utf8').toString('base64'),
    };
}

/**
 * Creates one JSON HTTP response.
 */
function createJsonResponse(status: number, payload: Record<string, unknown>): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Parses one mocked fetch request body by zero-based call index.
 */
function getJsonRequestBody(callIndex: number): Record<string, unknown> {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    const requestInit = mockFetch.mock.calls[callIndex]?.[1];
    return JSON.parse(String(requestInit?.body || '{}')) as Record<string, unknown>;
}
