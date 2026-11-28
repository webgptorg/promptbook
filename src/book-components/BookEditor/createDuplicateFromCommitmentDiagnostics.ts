import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

/**
 * Monaco diagnostic shown when a Book source declares its parent agent more than once.
 *
 * @private internal type of `BookEditorMonaco`
 */
type DuplicateFromCommitmentDiagnostic = {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly source: string;
    readonly severity: 'warning';
};

/**
 * Commitment declaring the parent agent one book inherits from.
 *
 * @private internal constant of `createDuplicateFromCommitmentDiagnostics`
 */
const FROM_COMMITMENT_TYPE = 'FROM';

/**
 * Creates Book editor diagnostics for a parent agent declared by more than one `FROM` commitment.
 *
 * Repeating `FROM` stays valid — the last one wins and overrides every earlier one — but an author who writes it
 * twice usually means only one of them, so every `FROM` keyword is marked to show which one actually applies.
 *
 * @param agentSource - Current editor content.
 * @returns Warning markers for every `FROM` keyword, empty when the book declares at most one parent.
 *
 * @private internal utility of `BookEditorMonaco`
 */
export function createDuplicateFromCommitmentDiagnostics(
    agentSource?: string_book,
): ReadonlyArray<DuplicateFromCommitmentDiagnostic> {
    if (!agentSource?.trim()) {
        return [];
    }

    const fromCommitments = parseAgentSourceWithCommitments(agentSource).commitments.filter(
        (commitment) => commitment.type === FROM_COMMITMENT_TYPE,
    );

    if (fromCommitments.length < 2) {
        return [];
    }

    const lastFromCommitment = fromCommitments[fromCommitments.length - 1]!;

    return fromCommitments.map((fromCommitment) => {
        const startColumn = fromCommitment.originalLine.indexOf(FROM_COMMITMENT_TYPE) + 1;
        const isEffectiveFromCommitment = fromCommitment === lastFromCommitment;
        const message = isEffectiveFromCommitment
            ? `\`${FROM_COMMITMENT_TYPE}\` is written ${fromCommitments.length} times in this book. Only this last one is used, the earlier ones are ignored.`
            : `\`${FROM_COMMITMENT_TYPE}\` is written ${fromCommitments.length} times in this book. Only the last one on line ${lastFromCommitment.lineNumber} is used, so this one is ignored.`;

        return {
            startLineNumber: fromCommitment.lineNumber,
            startColumn,
            endLineNumber: fromCommitment.lineNumber,
            endColumn: startColumn + FROM_COMMITMENT_TYPE.length,
            message,
            source: 'Promptbook',
            severity: 'warning',
        };
    });
}
