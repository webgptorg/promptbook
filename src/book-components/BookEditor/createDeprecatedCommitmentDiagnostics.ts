import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';
import { getCommitmentNoticeMetadata } from '../../commitments/_common/getCommitmentNoticeMetadata';

/**
 * Monaco diagnostic shape used by deprecated and unfinished commitment warnings.
 *
 * @private internal type of `BookEditorMonaco`
 */
type CommitmentNoticeDiagnostic = {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly source: string;
    readonly severity: 'warning';
};

/**
 * Creates Book editor diagnostics for deprecated and unfinished commitment keywords.
 *
 * The notice metadata is UI-only. This helper surfaces it in Monaco so legacy
 * and unfinished commitments remain functional while still guiding authors
 * toward preferred replacements or cautioning them about low-level usage.
 *
 * @param agentSource - Current editor content.
 * @returns Warning markers for deprecated and unfinished commitment keywords.
 *
 * @private internal utility of `BookEditorMonaco`
 */
export function createDeprecatedCommitmentDiagnostics(
    agentSource?: string_book,
): ReadonlyArray<CommitmentNoticeDiagnostic> {
    if (!agentSource?.trim()) {
        return [];
    }

    const parsed = parseAgentSourceWithCommitments(agentSource);
    const diagnostics: CommitmentNoticeDiagnostic[] = [];

    for (const commitment of parsed.commitments) {
        const definition = getCommitmentDefinition(commitment.type);
        const notice = definition ? getCommitmentNoticeMetadata(definition) : null;

        if (!definition || !notice) {
            continue;
        }

        const typeMatch = definition.createTypeRegex().exec(commitment.originalLine);

        if (!typeMatch?.groups?.type) {
            continue;
        }

        const matchedType = typeMatch.groups.type;
        const leadingCharactersCount = typeMatch[0].length - matchedType.length;
        const startColumn = leadingCharactersCount + 1;
        const endColumn = startColumn + matchedType.length;

        const message =
            notice.kind === 'unfinished'
                ? `\`${commitment.type}\` is unfinished and not ready to use. Be careful when using it.`
                : `\`${commitment.type}\` is deprecated. ${notice.message}`;

        diagnostics.push({
            startLineNumber: commitment.lineNumber,
            startColumn,
            endLineNumber: commitment.lineNumber,
            endColumn,
            message,
            source: 'Promptbook',
            severity: 'warning',
        });
    }

    return diagnostics;
}
