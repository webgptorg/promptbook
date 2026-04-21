import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE DEEPSEARCH', () => {
    it('should add deep_search tool and system message instructions when USE DEEPSEARCH is present', async () => {
        const agentSource = spaceTrim(`
            Deep Research Agent
            USE DEEPSEARCH
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'deep_search',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to DeepSearch');
    });

    it('should add extra deep-search instructions to the system message when provided', async () => {
        const agentSource = spaceTrim(`
            Deep Research Agent
            USE DEEPSEARCH Compare official sources with third-party benchmarks.
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('DeepSearch instructions');
        expect(requirements.systemMessage).toContain('Compare official sources with third-party benchmarks.');
    });

    it('should expose DeepSearch as a fast-parsed capability badge', () => {
        const agentSource = spaceTrim(`
            Deep Research Agent
            USE DEEPSEARCH
        `) as string_book;
        const parsedAgent = parseAgentSource(agentSource);

        expect(parsedAgent.capabilities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'search-engine',
                    label: 'DeepSearch',
                }),
            ]),
        );
    });
});
