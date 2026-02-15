import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/src/tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(),
}));

jest.mock('@/src/tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('../getFederatedServers', () => ({
    getFederatedServers: jest.fn(),
}));

jest.mock('./createServerAgentReferenceResolver', () => ({
    createServerAgentReferenceResolver: jest.fn(),
}));

import {
    $invalidateProvidedAgentReferenceResolverCache,
    $provideAgentReferenceResolver,
} from './$provideAgentReferenceResolver';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideServer } from '@/src/tools/$provideServer';
import { getFederatedServers } from '../getFederatedServers';
import { createServerAgentReferenceResolver } from './createServerAgentReferenceResolver';

const mockProvideAgentCollectionForServer = jest.mocked($provideAgentCollectionForServer);
const mockProvideServer = jest.mocked($provideServer);
const mockGetFederatedServers = jest.mocked(getFederatedServers);
const mockCreateServerAgentReferenceResolver = jest.mocked(createServerAgentReferenceResolver);

/**
 * Creates a deterministic resolver stub used by cache-provider tests.
 *
 * @param token - Unique token proving which resolver instance was returned.
 * @returns Minimal resolver implementation.
 */
function createResolverStub(token: string): { resolveCommitmentContent: (_type: string, _content: string) => Promise<string> } {
    return {
        resolveCommitmentContent: async () => token,
    };
}

describe('$provideAgentReferenceResolver', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        $invalidateProvidedAgentReferenceResolverCache();

        const collectionStub = {
            listAgents: async () => [],
        } as Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
        const serverStub = {
            publicUrl: new URL('https://local.example'),
        } as Awaited<ReturnType<typeof $provideServer>>;

        mockProvideAgentCollectionForServer.mockResolvedValue(collectionStub);
        mockProvideServer.mockResolvedValue(serverStub);
        mockGetFederatedServers.mockResolvedValue([]);
    });

    /**
     * Casts a simple resolver stub to the provider resolver type expected by mocks.
     *
     * @param resolver - Stub resolver to cast.
     * @returns Typed resolver for mocked factory return values.
     */
    function asFactoryResolver(
        resolver: { resolveCommitmentContent: (_type: string, _content: string) => Promise<string> },
    ): Awaited<ReturnType<typeof createServerAgentReferenceResolver>> {
        return resolver as Awaited<ReturnType<typeof createServerAgentReferenceResolver>>;
    }

    it('reuses cached resolver until forceRefresh is requested', async () => {
        const resolverA = createResolverStub('resolver-a');
        const resolverB = createResolverStub('resolver-b');

        mockCreateServerAgentReferenceResolver.mockResolvedValueOnce(asFactoryResolver(resolverA));
        mockCreateServerAgentReferenceResolver.mockResolvedValueOnce(asFactoryResolver(resolverB));

        const first = await $provideAgentReferenceResolver();
        const second = await $provideAgentReferenceResolver();
        const forced = await $provideAgentReferenceResolver({ forceRefresh: true });

        expect(first).toBe(resolverA);
        expect(second).toBe(resolverA);
        expect(forced).toBe(resolverB);
        expect(mockCreateServerAgentReferenceResolver).toHaveBeenCalledTimes(2);
    });

    it('rebuilds resolver after explicit cache invalidation', async () => {
        const resolverA = createResolverStub('resolver-a');
        const resolverB = createResolverStub('resolver-b');

        mockCreateServerAgentReferenceResolver.mockResolvedValueOnce(asFactoryResolver(resolverA));
        mockCreateServerAgentReferenceResolver.mockResolvedValueOnce(asFactoryResolver(resolverB));

        const first = await $provideAgentReferenceResolver();
        $invalidateProvidedAgentReferenceResolverCache();
        const second = await $provideAgentReferenceResolver();

        expect(first).toBe(resolverA);
        expect(second).toBe(resolverB);
        expect(mockCreateServerAgentReferenceResolver).toHaveBeenCalledTimes(2);
    });
});
