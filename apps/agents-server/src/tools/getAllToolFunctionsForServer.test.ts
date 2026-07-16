import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirements } from '../../../../src/book-2.0/agent-source/createAgentModelRequirements';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import { getAllToolFunctionsForServer } from './getAllToolFunctionsForServer';

describe('getAllToolFunctionsForServer', () => {
    it('keeps TEAM tool functions live after the server registry is created', async () => {
        const teammateUrl = 'https://local.example/agents/slave';
        const toolName = 'team_chat_slave';
        const toolFunctions = getAllToolFunctionsForServer();

        expect(toolFunctions[toolName]).toBeUndefined();

        await createAgentModelRequirements(
            validateBook(`
                Master
                FROM {Void}
                TEAM Ask for anything {slave}
                CLOSED
            `),
            undefined,
            undefined,
            undefined,
            {
                agentReferenceResolver: {
                    resolveCommitmentContent: async (_commitmentType, rawContent) =>
                        rawContent.replace('{slave}', teammateUrl),
                    resolveTeammateProfile: async (url) =>
                        url === teammateUrl
                            ? {
                                  agentName: 'slave',
                                  personaDescription: 'Teammate used in dynamic server tool tests.',
                              }
                            : null,
                },
            },
        );

        expect(toolFunctions[toolName]).toEqual(expect.any(Function));
    });
});
