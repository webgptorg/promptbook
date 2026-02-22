import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';
import { UsePrivacyCommitmentDefinition } from './USE_PRIVACY';

describe('createAgentModelRequirementsWithCommitments with USE PRIVACY', () => {
    it('should add privacy tool when USE PRIVACY is present', async () => {
        const agentSource = spaceTrim(`
            Privacy Agent
            USE PRIVACY
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'turn_privacy_on',
            }),
        );
        expect(requirements.systemMessage).toContain('"turn_privacy_on"');
    });

    it('should include extra instructions in the system message when provided', async () => {
        const agentSource = spaceTrim(`
            Privacy Agent
            USE PRIVACY Offer private mode when user asks not to store data.
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('Privacy instructions');
        expect(requirements.systemMessage).toContain('Offer private mode when user asks not to store data.');
    });
});

describe('UsePrivacyCommitmentDefinition tool function', () => {
    it('returns confirmation-required when private mode is not enabled', async () => {
        const definition = new UsePrivacyCommitmentDefinition();
        const tools = definition.getToolFunctions();
        const turnPrivacyOn = tools.turn_privacy_on!;

        const result = await turnPrivacyOn({});
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toMatchObject({
            status: 'confirmation-required',
        });
    });

    it('returns already-enabled when private mode is enabled in runtime context', async () => {
        const definition = new UsePrivacyCommitmentDefinition();
        const tools = definition.getToolFunctions();
        const turnPrivacyOn = tools.turn_privacy_on!;

        const result = await turnPrivacyOn({
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: JSON.stringify({
                memory: {
                    isPrivateMode: true,
                },
            }),
        });
        const parsedResult = JSON.parse(result);

        expect(parsedResult).toMatchObject({
            status: 'already-enabled',
        });
    });
});
