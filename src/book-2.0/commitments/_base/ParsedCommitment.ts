import type { BookCommitment } from './BookCommitment';

/**
 * Parsed commitment line from agent source
 */

export type ParsedCommitment = {
    /**
     * The commitment type (e.g., 'PERSONA', 'KNOWLEDGE')
     */
    type: BookCommitment;

    /**
     * The content part of the commitment
     */
    content: string;

    /**
     * The original line from the agent source
     */
    originalLine: string;

    /**
     * Line number in the agent source (1-based)
     */
    lineNumber: number;
};
