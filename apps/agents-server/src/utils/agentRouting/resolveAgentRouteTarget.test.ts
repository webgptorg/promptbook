import { resolveAgentRouteTarget } from './resolveAgentRouteTarget';
import { createBookScopedAgentIdentifier } from '../agentReferenceResolver/bookScopedAgentReferences';

/**
 * Constant for public URL.
 */
const PUBLIC_URL = new URL('https://local.example/');

/**
 * Map of mock agent collection.
 */
const mockAgentCollection = {
    findAgentBasicInformation: jest.fn(async () => ({
        agentName: 'Lawyer',
        permanentId: 'lawyer-123',
    })),
    listAgents: jest.fn(async () => [
        {
            agentName: 'Lawyer',
            permanentId: 'lawyer-123',
        },
    ]),
};

/**
 * Database rows returned by the direct local route lookup.
 */
let mockDirectAgentRows: Array<{ agentName: string; permanentId: string | null }> = [];

/**
 * Chainable Supabase query mock used by the direct local route lookup.
 */
type DirectAgentQueryMock = {
    select: jest.Mock;
    or: jest.Mock;
    is: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
};

/**
 * Mocked Supabase query for the direct local route lookup.
 */
const mockDirectAgentQuery: DirectAgentQueryMock = {
    select: jest.fn(() => mockDirectAgentQuery),
    or: jest.fn(() => mockDirectAgentQuery),
    is: jest.fn(() => mockDirectAgentQuery),
    order: jest.fn(() => mockDirectAgentQuery),
    limit: jest.fn(async () => ({ data: mockDirectAgentRows, error: null })),
};

/**
 * Mocked agent-reference resolver provider used by route-target tests.
 */
const mockProvideAgentReferenceResolver = jest.fn(
    async (options?: {
        readonly forceRefresh?: boolean;
    }) => {
        void options;
        return {
            resolveCommitmentContent: jest.fn(async () => '{Lawyer}'),
        };
    },
);

jest.mock('../../tools/$provideServer', () => ({
    $provideServer: jest.fn(async () => ({ publicUrl: PUBLIC_URL })),
}));

jest.mock('../../tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(async () => mockAgentCollection),
}));

jest.mock('../../database/$getTableName', () => ({
    $getTableName: jest.fn(async (tableName: string) => tableName),
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(() => ({
        from: jest.fn(() => mockDirectAgentQuery),
    })),
}));

jest.mock('../agentReferenceResolver/$provideAgentReferenceResolver', () => ({
    $provideAgentReferenceResolver: (options?: { forceRefresh?: boolean }) => mockProvideAgentReferenceResolver(options),
}));

jest.mock('../agentReferenceResolver/AgentReferenceResolutionIssue', () => ({
    consumeAgentReferenceResolutionIssues: jest.fn(() => [
        {
            commitmentType: 'TEAM',
            reference: 'Lawyer',
            token: '{Lawyer}',
            message: 'Not found',
        },
    ]),
}));

describe('resolveAgentRouteTarget', () => {
    beforeEach(() => {
        mockDirectAgentRows = [];
        jest.clearAllMocks();
    });

    it('resolves exact local agent ids without initializing the full reference resolver', async () => {
        mockDirectAgentRows = [
            {
                agentName: 'Lawyer',
                permanentId: 'lawyer-123',
            },
        ];

        const result = await resolveAgentRouteTarget('lawyer-123', { forceRefresh: true });

        expect(result).toEqual({
            kind: 'local',
            canonicalAgentId: 'lawyer-123',
            canonicalUrl: 'https://local.example/agents/lawyer-123',
        });
        expect(mockProvideAgentReferenceResolver).not.toHaveBeenCalled();
    });

    it('falls back to the local agent collection when TEAM resolution reports issues', async () => {
        const result = await resolveAgentRouteTarget('Lawyer');

        expect(result).toEqual({
            kind: 'local',
            canonicalAgentId: 'lawyer-123',
            canonicalUrl: 'https://local.example/agents/lawyer-123',
        });
        expect(mockAgentCollection.findAgentBasicInformation).toHaveBeenCalledWith('Lawyer');
        expect(mockAgentCollection.listAgents).not.toHaveBeenCalled();
    });

    it('keeps synthetic in-book route identifiers as canonical local routes', async () => {
        const embeddedIdentifier = createBookScopedAgentIdentifier('lawyer-123', 'Copywriter');
        const result = await resolveAgentRouteTarget(embeddedIdentifier);

        expect(result).toEqual({
            kind: 'local',
            canonicalAgentId: embeddedIdentifier,
            canonicalUrl: `https://local.example/agents/${encodeURIComponent(embeddedIdentifier)}`,
        });
    });

    it('resolves pseudo-agent references to dedicated pages', async () => {
        const result = await resolveAgentRouteTarget('User');

        expect(result).toEqual({
            kind: 'pseudo',
            pseudoAgentKind: 'USER',
            canonicalAgentId: 'user',
            canonicalUrl: 'https://local.example/agents/user',
        });
    });

    it('forces a fresh resolver lookup when requested', async () => {
        await resolveAgentRouteTarget('Lawyer', { forceRefresh: true });

        expect(mockProvideAgentReferenceResolver).toHaveBeenCalledWith({ forceRefresh: true });
    });
});
