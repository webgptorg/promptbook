import { resolveAgentRouteTarget } from './resolveAgentRouteTarget';
import { createBookScopedAgentIdentifier } from '../agentReferenceResolver/bookScopedAgentReferences';

const PUBLIC_URL = new URL('https://local.example/');

const mockAgentCollection = {
    listAgents: jest.fn(async () => [
        {
            agentName: 'Lawyer',
            permanentId: 'lawyer-123',
        },
    ]),
};

jest.mock('../../tools/$provideServer', () => ({
    $provideServer: jest.fn(async () => ({ publicUrl: PUBLIC_URL })),
}));

jest.mock('../../tools/$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(async () => mockAgentCollection),
}));

jest.mock('../agentReferenceResolver/$provideAgentReferenceResolver', () => ({
    $provideAgentReferenceResolver: jest.fn(async () => ({
        resolveCommitmentContent: jest.fn(async () => '{Lawyer}'),
    })),
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
        jest.clearAllMocks();
    });

    it('falls back to the local agent collection when TEAM resolution reports issues', async () => {
        const result = await resolveAgentRouteTarget('Lawyer');

        expect(result).toEqual({
            kind: 'local',
            canonicalAgentId: 'lawyer-123',
            canonicalUrl: 'https://local.example/agents/lawyer-123',
        });
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
});
