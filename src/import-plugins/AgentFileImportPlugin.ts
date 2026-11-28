import { spaceTrim } from 'spacetrim';
import type { string_book } from '../book-2.0/agent-source/string_book';
import { parseAgentSourceWithCommitments } from '../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { FileImportPlugin } from './FileImportPlugin';

/**
 * Plugin for importing agent books *(`.book` files)*
 *
 * @private [🥝] Maybe export the import plugins through some package
 */
export const AgentFileImportPlugin: FileImportPlugin = {
    name: 'agent-file-import-plugin',
    canImport(mimeType) {
        // [🧠] Should we have a specific MIME type for agent books?
        // For now, let's assume it's identified by .book extension or certain MIME types if provided
        return mimeType === 'text/x-promptbook' || mimeType === 'application/x-promptbook';
    },
    import(content) {
        const parseResult = parseAgentSourceWithCommitments(content as string_book);

        // Bring only the agent corpus (non-commitment lines and relevant commitments)
        // Stripping the agent name (which is usually the first line)
        const corpus = parseResult.nonCommitmentLines
            .filter((line, index) => index > 0 || !parseResult.agentName)
            .join('\n')
            .trim();

        // Also include relevant commitments that make up the "corpus" of the agent
        // For example PERSONA, RULE, KNOWLEDGE
        const relevantCommitments = parseResult.commitments
            .filter((c) => ['PERSONA', 'RULE', 'KNOWLEDGE'].includes(c.type))
            .map((c) => `${c.type} ${c.content}`)
            .join('\n\n');

        return spaceTrim(
            (block) => `
                ${block(relevantCommitments)}

                ${block(corpus)}
            `,
        ).trim();
    },
};
