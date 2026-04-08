import { parseAgentSourceWithCommitments } from '../../book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';

/**
 * Monaco diagnostic shape used by deprecated-commitment warnings.
 *
 * @private internal type of `BookEditorMonaco`
 */
type DeprecatedCommitmentDiagnostic = {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
    readonly message: string;
    readonly source: string;
    readonly severity: 'warning';
};

/**
 * Creates Book editor diagnostics for deprecated commitment keywords.
 *
 * The deprecation metadata is UI-only. This helper surfaces it in Monaco so
 * legacy commitments remain functional while still guiding authors toward
 * preferred replacements.
 *
 * @param agentSource - Current editor content.
 * @returns Warning markers for deprecated commitment keywords.
 *
 * @private internal utility of `BookEditorMonaco`
 */
export function createDeprecatedCommitmentDiagnostics(
    agentSource?: string_book,
): ReadonlyArray<DeprecatedCommitmentDiagnostic> {
    if (!agentSource?.trim()) {
        return [];
    }

    const parsed = parseAgentSourceWithCommitments(agentSource);
    const diagnostics: DeprecatedCommitmentDiagnostic[] = [];

    for (const commitment of parsed.commitments) {
        const definition = getCommitmentDefinition(commitment.type);
        if (!definition?.deprecation) {
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

        diagnostics.push({
            startLineNumber: commitment.lineNumber,
            startColumn,
            endLineNumber: commitment.lineNumber,
            endColumn,
            message: `\`${commitment.type}\` is deprecated. ${definition.deprecation.message}`,
            source: 'Promptbook',
            severity: 'warning',
        });
    }

    return diagnostics;
}
