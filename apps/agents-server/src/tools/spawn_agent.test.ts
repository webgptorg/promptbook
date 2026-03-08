import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../../../../src/commitments/_common/toolRuntimeContext';
import {
    CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH,
} from '../../../../src/collection/agent-collection/CreateAgentInput';
import { $provideAgentCollectionForServer } from './$provideAgentCollectionForServer';
import { createAgentWithDefaultVisibility } from '../utils/createAgentWithDefaultVisibility';
import { isUserAdmin } from '../utils/isUserAdmin';
import { $clearSpawnAgentRateLimitBucketsForTests, spawn_agent } from './spawn_agent';

jest.mock('./$provideAgentCollectionForServer', () => ({
    $provideAgentCollectionForServer: jest.fn(),
}));

jest.mock('../utils/createAgentWithDefaultVisibility', () => ({
    createAgentWithDefaultVisibility: jest.fn(),
}));

jest.mock('../utils/isUserAdmin', () => ({
    isUserAdmin: jest.fn(),
}));

const provideAgentCollectionForServerMock = $provideAgentCollectionForServer as jest.MockedFunction<
    typeof $provideAgentCollectionForServer
>;
const createAgentWithDefaultVisibilityMock = createAgentWithDefaultVisibility as jest.MockedFunction<
    typeof createAgentWithDefaultVisibility
>;
const isUserAdminMock = isUserAdmin as jest.MockedFunction<typeof isUserAdmin>;

describe('spawn_agent tool', () => {
    beforeEach(() => {
        provideAgentCollectionForServerMock.mockReset();
        createAgentWithDefaultVisibilityMock.mockReset();
        isUserAdminMock.mockReset();
        $clearSpawnAgentRateLimitBucketsForTests();

        isUserAdminMock.mockResolvedValue(true);
        provideAgentCollectionForServerMock.mockResolvedValue({} as Awaited<
            ReturnType<typeof $provideAgentCollectionForServer>
        >);
        createAgentWithDefaultVisibilityMock.mockResolvedValue({
            agentName: 'Child Agent',
            agentHash: 'hash',
            permanentId: 'child123',
            personaDescription: 'desc',
            initialMessage: null,
            meta: {},
            links: [],
            parameters: [],
            capabilities: [],
            samples: [],
            knowledgeSources: [],
        });
    });

    it('creates a persisted agent successfully', async () => {
        const resultRaw = await spawn_agent({
            source: 'Child Agent\nPERSONA You are a child.',
            visibility: 'UNLISTED',
        });
        const result = JSON.parse(resultRaw) as { status: string; agentId?: string; agent?: { agentName: string } };

        expect(result.status).toBe('created');
        expect(result.agentId).toBe('child123');
        expect(result.agent?.agentName).toBe('Child Agent');
        expect(createAgentWithDefaultVisibilityMock).toHaveBeenCalledWith(
            expect.anything(),
            'Child Agent\nPERSONA You are a child.',
            { visibility: 'UNLISTED', folderId: undefined, sortOrder: undefined },
        );
    });

    it('returns validation error for unknown fields', async () => {
        const resultRaw = await spawn_agent({
            source: 'Child Agent',
            unknownField: true,
        });
        const result = JSON.parse(resultRaw) as { status: string; error?: { code?: string } };

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe('validation_error');
        expect(createAgentWithDefaultVisibilityMock).not.toHaveBeenCalled();
    });

    it('returns validation error when required source is missing', async () => {
        const resultRaw = await spawn_agent({
            visibility: 'PRIVATE',
        });
        const result = JSON.parse(resultRaw) as { status: string; error?: { code?: string } };

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe('validation_error');
        expect(createAgentWithDefaultVisibilityMock).not.toHaveBeenCalled();
    });

    it('returns permission error when caller cannot create agents', async () => {
        isUserAdminMock.mockResolvedValue(false);

        const resultRaw = await spawn_agent({
            source: 'Child Agent',
        });
        const result = JSON.parse(resultRaw) as { status: string; error?: { code?: string } };

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe('permission_denied');
        expect(createAgentWithDefaultVisibilityMock).not.toHaveBeenCalled();
    });

    it('returns payload-too-large validation error', async () => {
        const resultRaw = await spawn_agent({
            source: 'x'.repeat(CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH + 1),
        });
        const result = JSON.parse(resultRaw) as { status: string; error?: { code?: string } };

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe('limit_reached');
        expect(createAgentWithDefaultVisibilityMock).not.toHaveBeenCalled();
    });

    it('returns rate-limit error when actor exceeds spawn quota', async () => {
        const baseArgs = {
            source: 'Child Agent',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                memory: {
                    userId: 42,
                    username: 'admin',
                    agentId: 'parent',
                },
            }),
        };

        for (let index = 0; index < 5; index++) {
            const resultRaw = await spawn_agent(baseArgs);
            const result = JSON.parse(resultRaw) as { status: string };
            expect(result.status).toBe('created');
        }

        const limitedResultRaw = await spawn_agent(baseArgs);
        const limitedResult = JSON.parse(limitedResultRaw) as { status: string; error?: { code?: string } };

        expect(limitedResult.status).toBe('error');
        expect(limitedResult.error?.code).toBe('limit_reached');
    });
});
