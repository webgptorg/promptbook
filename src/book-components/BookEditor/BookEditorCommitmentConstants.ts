// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Commitment types that receive TODO-style annotation (yellow highlight).
 *
 * @private internal utility of BookEditor and generate-grammar
 */
export const TODO_COMMITMENT_TYPES = ['TODO'] as const;

/**
 * Commitment types treated as low-visibility notes/comments (gray).
 *
 * @private internal utility of BookEditor and generate-grammar
 */
export const NOTE_COMMITMENT_TYPES = ['NOTE', 'NOTES', 'NONCE'] as const;

/**
 * Commitment types where compact agent references (`@id`, `{Name}`, URL) are supported.
 *
 * @private internal utility of BookEditor and generate-grammar
 */
export const AGENT_REFERENCE_COMMITMENT_TYPES = ['FROM', 'IMPORT', 'IMPORTS', 'TEAM'] as const;
