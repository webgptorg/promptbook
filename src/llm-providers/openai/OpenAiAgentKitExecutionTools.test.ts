import { describe, expect, it } from '@jest/globals';
import type { ModelRequirements } from '../../types/ModelRequirements';
import { OpenAiAgentKitExecutionTools } from './OpenAiAgentKitExecutionTools';

type BuildAgentKitToolsAccessor = {
    buildAgentKitTools(options: {
        tools: NonNullable<ModelRequirements['tools']>;
        vectorStoreId?: string;
    }): Array<Record<string, unknown>>;
};

describe('OpenAiAgentKitExecutionTools', () => {
    it('builds USE DEEPSEARCH as a native Agent SDK function tool backed by deep research', () => {
        const tools = new OpenAiAgentKitExecutionTools({
            apiKey: 'test-api-key',
        });
        const toolDefinitions = [
            {
                name: 'deep_search',
                description: 'Investigate the topic thoroughly on the public web.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The research request.',
                        },
                    },
                    required: ['query'],
                    additionalProperties: false,
                },
            },
        ] satisfies NonNullable<ModelRequirements['tools']>;

        const builtTools = (tools as unknown as BuildAgentKitToolsAccessor).buildAgentKitTools({
            tools: toolDefinitions,
        });

        expect(builtTools).toHaveLength(1);
        expect(builtTools[0]).toEqual(
            expect.objectContaining({
                type: 'function',
                name: 'deep_search',
                description: 'Investigate the topic thoroughly on the public web.',
            }),
        );
        expect((builtTools[0]?.parameters as { required?: string[] } | undefined)?.required).toEqual(['query']);
    });
});
