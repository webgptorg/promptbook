import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { KNOWLEDGE_SEARCH_TOOL_NAME } from './KNOWLEDGE';

describe('createAgentModelRequirementsWithCommitments with KNOWLEDGE', () => {
    it('adds the knowledge_search tool and Knowledge Search instructions for URL sources', async () => {
        const agentSource = spaceTrim(`
            Knowledge Agent
            KNOWLEDGE https://example.com/handbook.pdf
            KNOWLEDGE https://example.com/faq.md
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.knowledgeSources).toEqual([
            'https://example.com/handbook.pdf',
            'https://example.com/faq.md',
        ]);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: KNOWLEDGE_SEARCH_TOOL_NAME,
            }),
        );
        expect(requirements.systemMessage).toContain('## Knowledge Search');
        expect(requirements.systemMessage).toContain('`knowledge_search`');
        expect(requirements.systemMessage).toContain('https://example.com/handbook.pdf');
        expect(requirements.systemMessage.match(/## Knowledge Search/g)).toHaveLength(1);
    });

    it('adds inline knowledge sources to the shared Knowledge Search section', async () => {
        const agentSource = spaceTrim(`
            Knowledge Agent
            KNOWLEDGE The return window is 30 days after delivery.
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        const inlineKnowledgeSources = (requirements.knowledgeSources ?? []).filter((source) =>
            source.startsWith('data:text/plain'),
        );

        expect(inlineKnowledgeSources).toHaveLength(1);
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: KNOWLEDGE_SEARCH_TOOL_NAME,
            }),
        );
        expect(requirements.systemMessage).toContain('## Knowledge Search');
        expect(requirements.systemMessage).toContain('Inline source:');
    });
});
