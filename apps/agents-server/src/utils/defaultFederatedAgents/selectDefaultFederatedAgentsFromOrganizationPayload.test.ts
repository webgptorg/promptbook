import { selectDefaultFederatedAgentsFromOrganizationPayload } from './selectDefaultFederatedAgentsFromOrganizationPayload';

describe('selectDefaultFederatedAgentsFromOrganizationPayload', () => {
    it('selects only agents from the default folder subtree and deduplicates normalized names', () => {
        const result = selectDefaultFederatedAgentsFromOrganizationPayload(
            {
                success: true,
                folders: [
                    { id: 1, name: 'Default', parentId: null },
                    { id: 2, name: 'Showcase', parentId: 1 },
                    { id: 3, name: 'Other', parentId: null },
                ],
                agents: [
                    { agentName: 'Travel Guide', permanentId: 'travel-1', folderId: 1 },
                    { agentName: 'Code Helper', permanentId: 'code-1', folderId: 2 },
                    { agentName: 'Code helper', permanentId: 'code-2', folderId: 2 },
                    { agentName: 'Ignored Root Agent', permanentId: 'root-1', folderId: null },
                    { agentName: 'Ignored Other Agent', permanentId: 'other-1', folderId: 3 },
                ],
            },
            'https://core.example/',
        );

        expect(result).toEqual([
            {
                normalizedName: 'travel-guide',
                sourceAgentName: 'Travel Guide',
                sourceAgentIdentifier: 'travel-1',
                sourceAgentUrl: 'https://core.example/agents/travel-1',
            },
            {
                normalizedName: 'code-helper',
                sourceAgentName: 'Code Helper',
                sourceAgentIdentifier: 'code-1',
                sourceAgentUrl: 'https://core.example/agents/code-1',
            },
        ]);
    });

    it('prefers explicit remote urls when they are present', () => {
        const result = selectDefaultFederatedAgentsFromOrganizationPayload(
            {
                success: true,
                folders: [{ id: 1, name: 'default', parentId: null }],
                agents: [
                    {
                        agentName: 'Research Assistant',
                        permanentId: 'research-1',
                        folderId: 1,
                        url: 'https://core.example/agents/research-1?preview=false',
                    },
                ],
            },
            'https://core.example/',
        );

        expect(result).toEqual([
            {
                normalizedName: 'research-assistant',
                sourceAgentName: 'Research Assistant',
                sourceAgentIdentifier: 'research-1',
                sourceAgentUrl: 'https://core.example/agents/research-1?preview=false',
            },
        ]);
    });
});
