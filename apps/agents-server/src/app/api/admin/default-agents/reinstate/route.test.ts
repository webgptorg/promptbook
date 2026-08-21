import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { seedCoreAgents } from '../../../../../database/seedCoreAgents';
import { reinstateDefaultAgents } from '../../../../../database/reinstateDefaultAgents';
import { $provideServer } from '../../../../../tools/$provideServer';
import { $invalidateProvidedAgentReferenceResolverCache } from '../../../../../utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { invalidateCachedActiveOrganizationSnapshots } from '../../../../../utils/agentOrganization/loadAgentOrganizationState';
import { invalidateCachedServerAgentRuntime } from '../../../../../utils/cachedServerAgentRuntime';
import { isUserAdmin } from '../../../../../utils/isUserAdmin';
import { POST } from './route';

jest.mock('../../../../../database/seedCoreAgents', () => ({
    seedCoreAgents: jest.fn(),
}));

jest.mock('../../../../../database/reinstateDefaultAgents', () => ({
    reinstateDefaultAgents: jest.fn(),
}));

jest.mock('../../../../../tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('../../../../../utils/agentReferenceResolver/$provideAgentReferenceResolver', () => ({
    $invalidateProvidedAgentReferenceResolverCache: jest.fn(),
}));

jest.mock('../../../../../utils/agentOrganization/loadAgentOrganizationState', () => ({
    invalidateCachedActiveOrganizationSnapshots: jest.fn(),
}));

jest.mock('../../../../../utils/cachedServerAgentRuntime', () => ({
    invalidateCachedServerAgentRuntime: jest.fn(),
}));

jest.mock('../../../../../utils/isUserAdmin', () => ({
    isUserAdmin: jest.fn(),
}));

/**
 * Mocked core-agent seed operation used by the reinstatement route tests.
 */
const seedCoreAgentsMock = seedCoreAgents as jest.MockedFunction<typeof seedCoreAgents>;

/**
 * Mocked normal default-agent reinstatement operation used by the route tests.
 */
const reinstateDefaultAgentsMock = reinstateDefaultAgents as jest.MockedFunction<typeof reinstateDefaultAgents>;

/**
 * Mocked current-server provider used by the reinstatement route tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked resolver cache invalidation used by the reinstatement route tests.
 */
const invalidateProvidedAgentReferenceResolverCacheMock =
    $invalidateProvidedAgentReferenceResolverCache as jest.MockedFunction<typeof $invalidateProvidedAgentReferenceResolverCache>;

/**
 * Mocked organization snapshot invalidation used by the reinstatement route tests.
 */
const invalidateCachedActiveOrganizationSnapshotsMock =
    invalidateCachedActiveOrganizationSnapshots as jest.MockedFunction<typeof invalidateCachedActiveOrganizationSnapshots>;

/**
 * Mocked resolved-runtime cache invalidation used by the reinstatement route tests.
 */
const invalidateCachedServerAgentRuntimeMock = invalidateCachedServerAgentRuntime as jest.MockedFunction<
    typeof invalidateCachedServerAgentRuntime
>;

/**
 * Mocked administrator permission lookup used by the reinstatement route tests.
 */
const isUserAdminMock = isUserAdmin as jest.MockedFunction<typeof isUserAdmin>;

describe('POST /api/admin/default-agents/reinstate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        isUserAdminMock.mockResolvedValue(true);
        provideServerMock.mockResolvedValue({ tablePrefix: 'server_Test_' } as Awaited<ReturnType<typeof $provideServer>>);
        seedCoreAgentsMock.mockResolvedValue({
            coreFolderId: 1,
            createdAgentNames: ['Adam'],
        });
        reinstateDefaultAgentsMock.mockResolvedValue({ createdAgentNames: [] });
    });

    it('invalidates agent-resolution caches after restoring core agents', async () => {
        const response = await POST(createReinstateRequest('core'));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            scope: 'core',
            createdAgentNames: ['Adam'],
        });
        expect(seedCoreAgentsMock).toHaveBeenCalledWith({ tablePrefix: 'server_Test_' });
        expect(invalidateProvidedAgentReferenceResolverCacheMock).toHaveBeenCalledTimes(1);
        expect(invalidateCachedServerAgentRuntimeMock).toHaveBeenCalledTimes(1);
        expect(invalidateCachedActiveOrganizationSnapshotsMock).toHaveBeenCalledTimes(1);
    });
});

/**
 * Creates an administrator reinstatement request for one supported scope.
 *
 * @param scope - Bundled agent scope to restore.
 * @returns JSON POST request accepted by the reinstatement route.
 */
function createReinstateRequest(scope: 'core' | 'default'): Request {
    return new Request('https://current.example.com/api/admin/default-agents/reinstate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
    });
}
