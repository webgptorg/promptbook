import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE SEARCH ENGINE', () => {
    it('should add web_search tool and system message instructions when USE SEARCH ENGINE is present', async () => {
        const agentSource = spaceTrim(`
            Search Agent
            USE SEARCH ENGINE
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'web_search',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to the web search engine');
    });

    it('should add extra search instructions to the system message when provided', async () => {
        const agentSource = spaceTrim(`
            Search Agent
            USE SEARCH ENGINE Search only in english language
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.systemMessage).toContain('Search instructions');
        expect(requirements.systemMessage).toContain('Search only in english language');
    });

    it('should add web_search tool and system message instructions when USE SEARCH alias is used', async () => {
        const agentSource = spaceTrim(`
            Search Agent
            USE SEARCH
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'web_search',
            }),
        );
        expect(requirements.systemMessage).toContain('You have access to the web search engine');
    });
});
