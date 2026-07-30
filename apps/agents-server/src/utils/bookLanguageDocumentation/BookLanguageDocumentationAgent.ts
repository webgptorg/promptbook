import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * One agent available for inclusion in a Book language manual export.
 */
export type BookLanguageDocumentationAgentOption = {
    /**
     * Stable server identifier used by the export request.
     */
    readonly id: string;
    /**
     * Human-readable agent name shown in the export menu.
     */
    readonly name: string;
};

/**
 * Agent option with its current Book source, ready to be baked into a manual.
 */
export type BakedBookLanguageDocumentationAgent = BookLanguageDocumentationAgentOption & {
    /**
     * Current persisted Book source.
     */
    readonly source: string_book;
};
