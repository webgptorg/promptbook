import type { Server } from 'http';
import { buildAgentNameOrPermanentIdFilter } from '../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/buildAgentNameOrPermanentIdFilter';

/** Mock server factory used to exercise the same HTTP filters as the browser tests. */
const { createMockSupabaseServer } = require('../tests/e2e/mockSupabaseServer.cjs') as {
    createMockSupabaseServer: () => Server;
};

/** Agent which must never be returned for a lookup of another agent. */
const FIRST_AGENT = { id: 1, agentName: 'first-agent', permanentId: 'FirstID' };

/** Agent identifier includes LIKE wildcards and regular expression punctuation that must match literally. */
const SECOND_AGENT = { id: 2, agentName: 'second-agent', permanentId: 'Mixed_ID%.[1]' };

describe('mock Supabase REST API', () => {
    let server: Server;
    let endpoint: string;

    beforeAll(async () => {
        server = createMockSupabaseServer();
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Mock Supabase did not listen on a local TCP port.');
        }
        endpoint = `http://127.0.0.1:${address.port}/rest/v1/Agent`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([FIRST_AGENT, SECOND_AGENT]),
        });
        expect(response.status).toBe(201);
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    });

    it.each([SECOND_AGENT.agentName, SECOND_AGENT.permanentId, SECOND_AGENT.permanentId.toLowerCase()])(
        'resolves only the requested agent through the production OR filter: %s',
        async (identifier) => {
            const query = new URLSearchParams({
                or: `(${buildAgentNameOrPermanentIdFilter(identifier)})`,
                select: 'id,agentName,permanentId',
                limit: '1',
            });
            const response = await fetch(`${endpoint}?${query}`);
            expect(await response.json()).toEqual([SECOND_AGENT]);
        },
    );

    it('returns no agent for an unknown identifier', async () => {
        const query = new URLSearchParams({ or: `(${buildAgentNameOrPermanentIdFilter('missing-agent')})` });
        const response = await fetch(`${endpoint}?${query}`);
        expect(await response.json()).toEqual([]);
    });

    it.each([
        ['ilike.mixed*', [SECOND_AGENT]],
        ['ilike.Mixed\\_ID\\%.[_]', [SECOND_AGENT]],
        ['like.mixed*', []],
        ['ilike.ID', []],
        ['ilike.%', [FIRST_AGENT, SECOND_AGENT]],
    ])('matches LIKE patterns with the expected case, wildcards and literal punctuation: %s', async (filter, rows) => {
        const query = new URLSearchParams({ permanentId: filter as string, select: 'id,agentName,permanentId' });
        const response = await fetch(`${endpoint}?${query}`);
        expect(await response.json()).toEqual(rows);
    });

    it('rejects concurrent duplicate usernames with the PostgreSQL unique-constraint error', async () => {
        const userEndpoint = endpoint.replace(/\/Agent$/, '/User');
        /** Starts one independent identity insert to exercise concurrent creation. */
        const createUser = () =>
            fetch(userEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'concurrent-admin', isAdmin: true }),
            });
        const responses = await Promise.all([createUser(), createUser()]);
        expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
        const rejectedResponse = responses.find((response) => response.status === 409)!;
        expect(await rejectedResponse.json()).toMatchObject({ code: '23505' });

        const query = new URLSearchParams({ username: 'eq.concurrent-admin' });
        const response = await fetch(`${userEndpoint}?${query}`, {
            headers: { Accept: 'application/vnd.pgrst.object+json' },
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ username: 'concurrent-admin', isAdmin: true });
    });

    it('rejects a batch containing duplicate usernames without inserting partial rows', async () => {
        const userEndpoint = endpoint.replace(/\/Agent$/, '/User');
        const response = await fetch(userEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ username: 'duplicate-batch' }, { username: 'duplicate-batch' }]),
        });
        expect(response.status).toBe(409);
        expect(await response.json()).toMatchObject({ code: '23505' });

        const query = new URLSearchParams({ username: 'eq.duplicate-batch' });
        const remainingRows = await fetch(`${userEndpoint}?${query}`);
        expect(await remainingRows.json()).toEqual([]);
    });
});
