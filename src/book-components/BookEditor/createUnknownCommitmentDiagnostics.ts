import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

/**
 * Monaco diagnostic shown when a Book source uses an uppercase commitment not registered by Promptbook.
 *
 * @private internal type of `BookEditorMonaco`
 */
type UnknownCommitmentDiagnostic = {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly source: string;
    readonly severity: 'error';
};

/**
 * Creates Book editor diagnostics for uppercase commitments not registered by Promptbook.
 *
 * Unknown commitment blocks remain valid extra context in the generated system message,
 * but the editor marks their keywords so authors can spot likely typos immediately.
 *
 * @param agentSource - Current editor content.
 * @returns Error markers for all unknown commitment keywords.
 *
 * @private internal utility of `BookEditorMonaco`
 */
export function createUnknownCommitmentDiagnostics(
    agentSource?: string_book,
): ReadonlyArray<UnknownCommitmentDiagnostic> {
    if (!agentSource?.trim()) {
        return [];
    }

    return parseAgentSourceWithCommitments(agentSource).unknownCommitments.map((commitment) => {
        const startColumn = commitment.originalLine.indexOf(commitment.type) + 1;

        return {
            startLineNumber: commitment.lineNumber,
            startColumn,
            endLineNumber: commitment.lineNumber,
            endColumn: startColumn + commitment.type.length,
            message: `Unknown commitment \`${commitment.type}\` is added to the system message as extra context.`,
            source: 'Promptbook',
            severity: 'error',
        };
    });
}
