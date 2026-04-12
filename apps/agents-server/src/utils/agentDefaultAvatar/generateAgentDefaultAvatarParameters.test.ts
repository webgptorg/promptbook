import { describe, expect, it, jest } from '@jest/globals';
import type { AgentBasicInformation, ChatPromptResult, LlmExecutionTools } from '@promptbook-local/types';
import { agentDefaultAvatarParametersSchema } from './AgentDefaultAvatarParameters';
import {
    computeAgentDefaultAvatarFingerprint,
    generateAgentDefaultAvatarParameters,
} from './generateAgentDefaultAvatarParameters';

/**
 * Creates one minimal resolved agent profile for stage-1 tests.
 */
function createTestAgentBasicInformation(overrides: Partial<AgentBasicInformation>): AgentBasicInformation {
    return {
        agentName: 'test-agent',
        agentHash: 'hash-test-agent',
        personaDescription: 'Helpful default persona',
        initialMessage: 'Hello there.',
        meta: {},
        links: [],
        parameters: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        ...overrides,
    };
}

/**
 * Creates one minimal chat result compatible with the LLM tools contract.
 */
function createMockChatPromptResult(content: string): ChatPromptResult {
    return {
        content,
        modelName: 'mock-model',
        timing: {
            start: '2026-04-10T00:00:00Z',
            complete: '2026-04-10T00:00:01Z',
        },
        usage: {
            price: { value: 0, isUncertain: true },
            duration: { value: 0, isUncertain: true },
            input: {} as ChatPromptResult['usage']['input'],
            output: {} as ChatPromptResult['usage']['output'],
        },
        rawPromptContent: '',
        rawRequest: null,
        rawResponse: {},
    } as unknown as ChatPromptResult;
}

describe('generateAgentDefaultAvatarParameters', () => {
    it('validates one kind-oriented LLM response against the schema', async () => {
        const agentSource = `Kind Agent\nPERSONA A warm and kind helper focused on empathy and support.`;
        const callChatModel: NonNullable<LlmExecutionTools['callChatModel']> = jest.fn(async () =>
            createMockChatPromptResult(
                JSON.stringify({
                    traitTags: ['kind', 'creative'],
                    kindness: 4,
                    strictness: 1,
                energy: 3,
                formality: 2,
                archetype: 'mentor',
                paletteFamily: 'sunrise',
                backgroundPattern: 'halo',
                faceShape: 'round',
                eyeStyle: 'soft',
                    accessory: 'glasses',
                }),
            ),
        );

        const parameters = await generateAgentDefaultAvatarParameters({
            llmTools: { callChatModel },
            agent: createTestAgentBasicInformation({
                agentName: 'kind-agent',
                personaDescription: 'A kind, warm, and encouraging guide.',
            }),
            agentSource,
            agentFingerprint: computeAgentDefaultAvatarFingerprint(agentSource),
        });

        expect(callChatModel).toHaveBeenCalledTimes(1);
        expect(parameters.traitTags).toEqual(['kind', 'creative']);
        expect(parameters.kindness).toBe(4);
        expect(agentDefaultAvatarParametersSchema.parse(parameters)).toEqual(parameters);
    });

    it('validates one strict-oriented LLM response against the schema', async () => {
        const agentSource = `Strict Agent\nPERSONA A strict compliance assistant who enforces rules and precision.`;
        const callChatModel: NonNullable<LlmExecutionTools['callChatModel']> = jest.fn(async () =>
            createMockChatPromptResult(
                JSON.stringify({
                    traitTags: ['strict', 'analytical'],
                    kindness: 1,
                    strictness: 4,
                energy: 2,
                formality: 4,
                archetype: 'guardian',
                paletteFamily: 'slate',
                backgroundPattern: 'circuit',
                faceShape: 'square',
                eyeStyle: 'focused',
                    accessory: 'badge',
                }),
            ),
        );

        const parameters = await generateAgentDefaultAvatarParameters({
            llmTools: { callChatModel },
            agent: createTestAgentBasicInformation({
                agentName: 'strict-agent',
                personaDescription: 'A strict, formal, and rule-heavy compliance reviewer.',
            }),
            agentSource,
            agentFingerprint: computeAgentDefaultAvatarFingerprint(agentSource),
        });

        expect(callChatModel).toHaveBeenCalledTimes(1);
        expect(parameters.traitTags).toEqual(['strict', 'analytical']);
        expect(parameters.strictness).toBe(4);
        expect(agentDefaultAvatarParametersSchema.parse(parameters)).toEqual(parameters);
    });
});
