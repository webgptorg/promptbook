import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GET } from './route';
import { $provideServer } from '@/src/tools/$provideServer';
import { getMetadataMap } from '../../../database/getMetadata';
import { getFederatedServers } from '../../../utils/getFederatedServers';
import { loadLocalOrganizationSearchDataset } from '../../../search/createDefaultServerSearchProviders/loadLocalOrganizationSearchDataset';
import { DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY } from '../../../constants/defaultAgentAvatarVisual';

jest.mock('@/src/tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('../../../database/getMetadata', () => ({
    getMetadataMap: jest.fn(),
}));

jest.mock('../../../utils/getFederatedServers', () => ({
    getFederatedServers: jest.fn(),
}));

jest.mock('../../../search/createDefaultServerSearchProviders/loadLocalOrganizationSearchDataset', () => ({
    loadLocalOrganizationSearchDataset: jest.fn(),
}));

/**
 * Mocked server provider used by the agents route test.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked metadata loader used by the agents route test.
 */
const getMetadataMapMock = getMetadataMap as jest.MockedFunction<typeof getMetadataMap>;

/**
 * Mocked federated-server loader used by the agents route test.
 */
const getFederatedServersMock = getFederatedServers as jest.MockedFunction<typeof getFederatedServers>;

/**
 * Mocked local dataset loader used by the agents route test.
 */
const loadLocalOrganizationSearchDatasetMock = loadLocalOrganizationSearchDataset as jest.MockedFunction<
    typeof loadLocalOrganizationSearchDataset
>;

describe('GET /api/agents', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('includes the server default avatar visual id in the federated agents payload', async () => {
        provideServerMock.mockResolvedValue({
            id: 1,
            publicUrl: new URL('https://local.example/'),
            tablePrefix: 'prefix_',
        });
        getMetadataMapMock.mockResolvedValue({
            [DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY]: 'ASCII_OCTOPUS',
        });
        getFederatedServersMock.mockResolvedValue(['https://remote.example']);
        loadLocalOrganizationSearchDatasetMock.mockResolvedValue({
            agents: [
                {
                    id: 1,
                    agentName: 'Helper',
                    agentSource: 'Helper',
                    folderId: null,
                    permanentId: 'helper-id',
                    visibility: 'PUBLIC',
                    resolvedAgentProfile: {
                        agentName: 'Helper',
                        agentHash: 'helper-hash',
                        personaDescription: 'Helpful assistant',
                        initialMessage: null,
                        meta: {
                            fullname: 'Helper',
                            description: 'Helpful assistant',
                            color: '#4477ff',
                        },
                        links: [],
                        parameters: [],
                        capabilities: [],
                        samples: [],
                        knowledgeSources: [],
                    },
                    resolvedAgentSource: 'Helper',
                },
            ],
            folders: [],
            folderById: new Map(),
        } as Awaited<ReturnType<typeof loadLocalOrganizationSearchDataset>>);

        const response = await GET();
        const body = (await response.json()) as {
            readonly agents: Array<{ url?: string }>;
            readonly federatedServers: string[];
            readonly defaultAgentAvatarVisualId: string;
        };

        expect(getMetadataMapMock).toHaveBeenCalledWith([DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY]);
        expect(body.defaultAgentAvatarVisualId).toBe('ascii-octopus');
        expect(body.federatedServers).toEqual(['https://remote.example']);
        expect(body.agents[0]?.url).toBe('https://local.example/agents/helper-id');
    });
});
