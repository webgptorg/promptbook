import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { NotFoundError } from '@promptbook-local/core';
import { NextRequest } from 'next/server';
import { GET } from './route';

jest.mock('@/src/tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(),
}));

jest.mock('@/src/utils/getCurrentUser', () => ({
    getCurrentUser: jest.fn(),
}));

/**
 * Typed access to the mocked current-user helper.
 */
const getCurrentUserMock = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

/**
 * Typed access to the mocked agent collection provider.
 */
const provideAgentCollectionForServerMock = $provideAgentCollectionForServer as jest.MockedFunction<
    typeof $provideAgentCollectionForServer
>;

/**
 * Creates route params for the agent book download endpoint.
 *
 * @param agentName - Encoded or raw agent route segment.
 * @returns Next route context object.
 */
function createRouteContext(agentName: string): { readonly params: Promise<{ readonly agentName: string }> } {
    return { params: Promise.resolve({ agentName }) };
}

/**
 * Creates a minimal authenticated user record for route tests.
 *
 * @returns User object accepted by `getCurrentUser`.
 */
function createAuthenticatedUser(): NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> {
    return {
        id: 101,
        username: 'book-download-user',
        isAdmin: false,
        profileImageUrl: null,
    };
}

describe('GET /agents/[agentName]/api/book/download', () => {
    beforeEach(() => {
        getCurrentUserMock.mockReset();
        provideAgentCollectionForServerMock.mockReset();
    });

    it('returns a downloadable stored book source for an authenticated user', async () => {
        const collection = {
            getAgentSource: jest.fn(async () => 'Školník\n\nPERSONA Helps with school administration.'),
            findAgentBasicInformation: jest.fn(async () => ({ agentName: 'Školník' })),
        } as unknown as Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;

        getCurrentUserMock.mockResolvedValue(createAuthenticatedUser());
        provideAgentCollectionForServerMock.mockResolvedValue(collection);

        const response = await GET(
            new NextRequest('http://localhost/agents/agent-123/api/book/download'),
            createRouteContext('agent-123'),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
        expect(response.headers.get('Cache-Control')).toBe('no-store');
        expect(response.headers.get('Content-Disposition')).toContain(`filename*=UTF-8''%C5%A0koln%C3%ADk.book`);
        expect(collection.getAgentSource).toHaveBeenCalledWith('agent-123');
        expect(collection.findAgentBasicInformation).toHaveBeenCalledWith('agent-123');
        await expect(response.text()).resolves.toBe('Školník\n\nPERSONA Helps with school administration.');
    });

    it('decodes the routed agent identifier before reading the collection', async () => {
        const collection = {
            getAgentSource: jest.fn(async () => 'PERSONA Decoded route'),
            findAgentBasicInformation: jest.fn(async () => ({ agentName: 'Encoded Agent' })),
        } as unknown as Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;

        getCurrentUserMock.mockResolvedValue(createAuthenticatedUser());
        provideAgentCollectionForServerMock.mockResolvedValue(collection);

        await GET(
            new NextRequest('http://localhost/agents/Encoded%20Agent/api/book/download'),
            createRouteContext('Encoded%20Agent'),
        );

        expect(collection.getAgentSource).toHaveBeenCalledWith('Encoded Agent');
        expect(collection.findAgentBasicInformation).toHaveBeenCalledWith('Encoded Agent');
    });

    it('rejects unauthenticated users before reading the agent collection', async () => {
        getCurrentUserMock.mockResolvedValue(null);

        const response = await GET(
            new NextRequest('http://localhost/agents/agent-123/api/book/download'),
            createRouteContext('agent-123'),
        );

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
        expect(provideAgentCollectionForServerMock).not.toHaveBeenCalled();
    });

    it('maps missing agents to a 404 response', async () => {
        const collection = {
            getAgentSource: jest.fn(async () => {
                throw new NotFoundError('Agent `missing-agent` not found.');
            }),
            findAgentBasicInformation: jest.fn(async () => null),
        } as unknown as Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;

        getCurrentUserMock.mockResolvedValue(createAuthenticatedUser());
        provideAgentCollectionForServerMock.mockResolvedValue(collection);

        const response = await GET(
            new NextRequest('http://localhost/agents/missing-agent/api/book/download'),
            createRouteContext('missing-agent'),
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: 'Agent `missing-agent` not found.' });
    });
});
