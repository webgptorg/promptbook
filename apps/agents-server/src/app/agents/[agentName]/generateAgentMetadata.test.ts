import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { generateAgentMetadata } from './generateAgentMetadata';
import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import { resolvePseudoAgentDescriptor } from '../../../utils/pseudoAgents';
import { getAgentName, getAgentProfile } from './_utils';

jest.mock('@/src/tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('@/src/utils/getServerVisibility', () => ({
    getServerVisibility: jest.fn(),
}));

jest.mock('../../../utils/pseudoAgents', () => ({
    resolvePseudoAgentDescriptor: jest.fn(),
}));

jest.mock('./_utils', () => ({
    getAgentName: jest.fn(),
    getAgentProfile: jest.fn(),
}));

/**
 * Mocked server provider used by agent metadata tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked visibility resolver used by agent metadata tests.
 */
const getServerVisibilityMock = getServerVisibility as jest.MockedFunction<typeof getServerVisibility>;

/**
 * Mocked pseudo-agent resolver used by agent metadata tests.
 */
const resolvePseudoAgentDescriptorMock = resolvePseudoAgentDescriptor as jest.MockedFunction<
    typeof resolvePseudoAgentDescriptor
>;

/**
 * Mocked route-agent name resolver used by agent metadata tests.
 */
const getAgentNameMock = getAgentName as jest.MockedFunction<typeof getAgentName>;

/**
 * Mocked agent profile resolver used by agent metadata tests.
 */
const getAgentProfileMock = getAgentProfile as jest.MockedFunction<typeof getAgentProfile>;

describe('generateAgentMetadata visibility policy', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns full share metadata and indexability for public server + public agent', async () => {
        provideServerMock.mockResolvedValue({
            id: 1,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');
        resolvePseudoAgentDescriptorMock.mockReturnValue(null);
        getAgentNameMock.mockResolvedValue('assistant');
        getAgentProfileMock.mockResolvedValue({
            agentName: 'assistant',
            permanentId: 'assistant-1',
            personaDescription: 'Helps with planning.',
            visibility: 'PUBLIC',
            meta: {
                fullname: 'Assistant',
                description: 'A public planning assistant.',
            },
        } as Awaited<ReturnType<typeof getAgentProfile>>);

        const metadata = await generateAgentMetadata({
            params: Promise.resolve({ agentName: 'assistant' }),
        });

        expect(metadata.robots).toEqual({ index: true, follow: true });
        expect(metadata.alternates?.canonical).toBe('/agents/assistant-1');
        expect(metadata.openGraph?.url).toBe('/agents/assistant-1');
        expect(metadata.twitter?.title).toBe('Assistant');
    });

    it('returns reduced noindex metadata for private server even when agent is public', async () => {
        provideServerMock.mockResolvedValue({
            id: 2,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PRIVATE');
        resolvePseudoAgentDescriptorMock.mockReturnValue(null);
        getAgentNameMock.mockResolvedValue('assistant');
        getAgentProfileMock.mockResolvedValue({
            agentName: 'assistant',
            permanentId: 'assistant-1',
            personaDescription: 'Helps with planning.',
            visibility: 'PUBLIC',
            meta: {
                fullname: 'Assistant',
                description: 'A public planning assistant.',
            },
        } as Awaited<ReturnType<typeof getAgentProfile>>);

        const metadata = await generateAgentMetadata({
            params: Promise.resolve({ agentName: 'assistant' }),
        });

        expect(metadata.robots).toEqual({ index: false, follow: false });
        expect(metadata.openGraph).toBeUndefined();
        expect(metadata.twitter).toBeUndefined();
        expect(metadata.alternates).toBeUndefined();
    });

    it('returns reduced noindex metadata for unlisted agents on public servers', async () => {
        provideServerMock.mockResolvedValue({
            id: 3,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');
        resolvePseudoAgentDescriptorMock.mockReturnValue(null);
        getAgentNameMock.mockResolvedValue('hidden-assistant');
        getAgentProfileMock.mockResolvedValue({
            agentName: 'hidden-assistant',
            permanentId: 'hidden-assistant',
            personaDescription: 'Hidden profile.',
            visibility: 'UNLISTED',
            meta: {
                fullname: 'Hidden Assistant',
                description: 'Not listed in sitemap.',
            },
        } as Awaited<ReturnType<typeof getAgentProfile>>);

        const metadata = await generateAgentMetadata({
            params: Promise.resolve({ agentName: 'hidden-assistant' }),
        });

        expect(metadata.robots).toEqual({ index: false, follow: false });
        expect(metadata.openGraph).toBeUndefined();
        expect(metadata.twitter).toBeUndefined();
    });
});
