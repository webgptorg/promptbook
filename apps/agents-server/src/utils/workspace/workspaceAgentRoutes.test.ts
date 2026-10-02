import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextRequest } from 'next/server';
import { createWorkspaceFixture } from '../../../../../scripts/run-codex-prompts/workspace/testing/workspaceFixture';
import { executeWorkspaceGit } from '../../../../../scripts/run-codex-prompts/git/workspaceMutation';
import { hashWorkspaceSource } from '../../../../../scripts/run-codex-prompts/workspace/workspaceAgentFiles';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { POST as createFolder } from '../../app/api/agent-folders/route';
import { PATCH as renameFolder, DELETE as deleteFolder } from '../../app/api/agent-folders/[folderId]/route';
import { POST as restoreFolder } from '../../app/api/agent-folders/[folderId]/restore/route';
import { PATCH as renameAgent, DELETE as deleteAgent } from '../../app/api/agents/[agentName]/route';
import { POST as restoreAgent } from '../../app/api/agents/[agentName]/restore/route';
import { PUT as saveBook } from '../../app/agents/[agentName]/api/book/route';
import { POST as createAgent } from '../../app/api/v1/agents/route';
import { POST as moveAgent } from '../../app/api/v1/folders/[folderId]/agents/[agentId]/route';

/** Only request identity/provider wiring is mocked; production routes, SQLite, Book mutations and Git are real. */
let mockFixture: Awaited<ReturnType<typeof createWorkspaceFixture>>;
/** Authentication is toggled to prove anonymous requests never reach source mutations. */
let isAuthenticated = true;
jest.mock('../../tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: () => Promise.resolve(mockFixture.collection),
}));
jest.mock('../../database/$provideSupabaseForServer', () => ({ $provideSupabaseForServer: () => mockFixture.client }));
jest.mock('../../database/$getTableName', () => ({ $getTableName: async (name: string) => name }));
jest.mock('../../tools/$provideServer', () => ({
    $provideServer: async () => ({ tablePrefix: '', publicUrl: 'http://localhost:4441' }),
}));
jest.mock('../getCurrentUser', () => ({
    getCurrentUser: async () => (isAuthenticated ? { id: 1, username: 'alice', isAdmin: true } : null),
}));
jest.mock('../isUserAdmin', () => ({ isUserAdmin: async () => isAuthenticated }));
jest.mock('../currentUserIdentity', () => ({
    resolveCurrentUserIdentity: async () => (isAuthenticated ? { userId: 1 } : null),
}));
jest.mock('../managementApi/managementApiAuth', () => ({
    resolveManagementApiIdentity: async () =>
        isAuthenticated
            ? { success: true, identity: { userId: 1 } }
            : { success: false, status: 401, code: 'unauthorized', message: 'Authentication required' },
}));
jest.mock('./workspaceAgentStorage', () => ({
    mutateAgentOrganizationRoute: async (operation: () => Promise<Response>) => {
        try {
            return await mockFixture.collection.mutateOrganization(operation);
        } catch (error) {
            return Response.json({ error: (error as Error).message }, { status: 409 });
        }
    },
    mutateAgentOrganization: (operation: () => Promise<unknown>) =>
        mockFixture.collection.mutateOrganization(operation),
}));
jest.mock('../agentReferenceResolver/$provideAgentReferenceResolver', () => ({
    $provideAgentReferenceResolver: async () => undefined,
}));
jest.mock('../resolveServerAgentContext', () => ({
    resolveServerAgentContext: async ({ agentIdentifier }: { agentIdentifier: string }) => ({
        resolvedAgentProfile: parseAgentSource(await mockFixture.collection.getAgentSource(agentIdentifier)),
    }),
}));
jest.mock('../managementApi/managementApiAgents', () => ({
    ...jest.requireActual('../managementApi/managementApiAgents'),
    resolveOwnedAgentDerivedState: async (row: { agentSource: string }) => ({
        resolvedAgentProfile: parseAgentSource(row.agentSource as string_book),
    }),
}));
jest.mock('../agentGoalChat', () => ({ scheduleAgentGoalChatModifiedNote: jest.fn() }));
jest.mock('../agentOrganization/loadAgentOrganizationState', () => ({
    ...jest.requireActual('../agentOrganization/loadAgentOrganizationState'),
    invalidateCachedActiveOrganizationSnapshots: jest.fn(),
}));

/** Builds a real HTTP request consumed by the app route, without running an HTTP server. */
function request(path: string, method: string, body: unknown, headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost:4441${path}`, {
        method,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json', ...headers },
    });
}

describe('workspace existing authorized mutation routes', () => {
    beforeEach(async () => {
        mockFixture = await createWorkspaceFixture();
        isAuthenticated = true;
    });
    afterEach(async () => {
        await mockFixture.dispose();
        jest.clearAllMocks();
    });
    it('creates, saves optimistically, renames, moves, deletes and restores actual Books/folders with scoped commits', async () => {
        const created = await createAgent(
            request('/api/v1/agents', 'POST', { source: 'Designer\nFROM VOID\nGOAL Design.\n' }),
        );
        expect(created.status).toBe(201);
        const id = await mockFixture.collection.getAgentPermanentId('designer');
        const source = await mockFixture.collection.getAgentSource(id);
        const saved = await saveBook(
            request(`/agents/${id}/api/book`, 'PUT', source + '\nRULE API edit.\n', {
                'X-Promptbook-Source-Revision': hashWorkspaceSource(source),
            }),
            { params: Promise.resolve({ agentName: id }) },
        );
        expect(saved.status).toBe(200);
        const stale = await saveBook(
            request(`/agents/${id}/api/book`, 'PUT', source + '\nRULE Stale browser.\n', {
                'X-Promptbook-Source-Revision': hashWorkspaceSource(source),
            }),
            { params: Promise.resolve({ agentName: id }) },
        );
        expect(stale.status).toBe(409);
        const renamed = await renameAgent(request(`/api/agents/${id}`, 'PATCH', { name: 'Product Designer' }), {
            params: Promise.resolve({ agentName: id }),
        });
        expect(renamed.status).toBe(200);
        const folderResponse = await createFolder(request('/api/agent-folders', 'POST', { name: 'Team' }));
        expect(folderResponse.status).toBe(200);
        const folderId = (await folderResponse.json()).folder.id;
        expect(
            (
                await moveAgent(request('/move', 'POST', {}), {
                    params: Promise.resolve({ folderId: String(folderId), agentId: id }),
                })
            ).status,
        ).toBe(200);
        expect(
            (
                await renameFolder(request('/folder', 'PATCH', { name: 'Engineering' }), {
                    params: Promise.resolve({ folderId: String(folderId) }),
                })
            ).status,
        ).toBe(200);
        expect(await readFile(join(mockFixture.root, 'agents/Engineering/product-designer.book'), 'utf-8')).toContain(
            'API edit',
        );
        expect(
            (await deleteAgent(request('/agent', 'DELETE', {}), { params: Promise.resolve({ agentName: id }) })).status,
        ).toBe(200);
        expect(
            (await restoreAgent(request('/restore', 'POST', {}), { params: Promise.resolve({ agentName: id }) }))
                .status,
        ).toBe(200);
        expect(
            (
                await deleteFolder(request('/folder', 'DELETE', {}), {
                    params: Promise.resolve({ folderId: String(folderId) }),
                })
            ).status,
        ).toBe(200);
        expect(
            (
                await restoreFolder(request('/restore-folder', 'POST', {}), {
                    params: Promise.resolve({ folderId: String(folderId) }),
                })
            ).status,
        ).toBe(200);
        expect(await mockFixture.collection.getAgentPermanentId('product-designer')).toBe(id);
        const files = await executeWorkspaceGit(mockFixture.root, ['log', '--format=', '--name-only', 'HEAD~10..HEAD']);
        expect(files).toContain('agents/Engineering/product-designer.book');
        expect(files).not.toMatch(/sqlite|secrets|password/u);
    });

    it('rejects unauthorized controls and path escapes without file or commit side effects', async () => {
        const head = await executeWorkspaceGit(mockFixture.root, ['rev-parse', 'HEAD']);
        isAuthenticated = false;
        expect((await createFolder(request('/folder', 'POST', { name: 'Anonymous' }))).status).toBe(401);
        expect(
            (await createAgent(request('/api/v1/agents', 'POST', { source: 'Anonymous\nGOAL Edit.\n' }))).status,
        ).toBe(401);
        isAuthenticated = true;
        expect((await createFolder(request('/folder', 'POST', { name: '..' }))).status).toBe(409);
        expect(await executeWorkspaceGit(mockFixture.root, ['rev-parse', 'HEAD'])).toBe(head);
    });
});
