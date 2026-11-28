import type { string_book } from '@promptbook-local/types';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';

/**
 * One warning shown on the export-as-transpiled-code page.
 */
export type TranspiledAgentExportWarning = {
    /**
     * Canonical commitment name or functionality label that cannot be exported 1:1.
     */
    readonly commitmentName: string;

    /**
     * Human-readable explanation shown to the user.
     */
    readonly description: string;
};

/**
 * Commitment keywords that are treated as non-transpilable by the export page.
 */
const OPEN_COMMITMENT_TYPE = 'OPEN';
const CLOSED_COMMITMENT_TYPE = 'CLOSED';
const MODEL_COMMITMENT_TYPES = ['MODEL', 'MODELS'];
const USER_LOCATION_COMMITMENT_TYPES = ['USE USER LOCATION', 'USER LOCATION'];
const PRIVACY_COMMITMENT_TYPES = ['USE PRIVACY', 'PRIVACY'];

/**
 * Collects export warnings for commitments that cannot be represented 1:1 in transpiled code.
 *
 * The check is source-driven and intentionally independent of the selected transpiler.
 *
 * @param agentSource - Agent source to inspect.
 * @returns Warning list shown on the export page.
 */
export function getTranspiledAgentExportWarnings(agentSource: string_book): Array<TranspiledAgentExportWarning> {
    const commitmentTypes = new Set<string>(
        parseAgentSourceWithCommitments(agentSource).commitments.map((commitment) => commitment.type),
    );
    const warnings: Array<TranspiledAgentExportWarning> = [];

    // OPEN is special because the warning must cover both explicit OPEN and the implicit default-open state.
    const isExplicitOpen = commitmentTypes.has(OPEN_COMMITMENT_TYPE);
    const isMissingClosed = !commitmentTypes.has(CLOSED_COMMITMENT_TYPE);
    if (isExplicitOpen || isMissingClosed) {
        warnings.push({
            commitmentName: OPEN_COMMITMENT_TYPE,
            description: createOpenWarningDescription({ isExplicitOpen, isMissingClosed }),
        });
    }

    if (hasAnyCommitmentType(commitmentTypes, MODEL_COMMITMENT_TYPES)) {
        warnings.push({
            commitmentName: 'MODEL',
            description:
                'The transpiler chooses the target model, so `MODEL` settings and related parameters cannot be preserved 1:1.',
        });
    }

    if (hasAnyCommitmentType(commitmentTypes, USER_LOCATION_COMMITMENT_TYPES)) {
        warnings.push({
            commitmentName: 'USE USER LOCATION',
            description:
                'It depends on browser geolocation and permission state, so exported code cannot preserve it 1:1.',
        });
    }

    if (hasAnyCommitmentType(commitmentTypes, PRIVACY_COMMITMENT_TYPES)) {
        warnings.push({
            commitmentName: 'USE PRIVACY',
            description:
                'It depends on UI confirmation and runtime privacy state, so exported code cannot preserve it 1:1.',
        });
    }

    return warnings;
}

/**
 * Checks whether the source contains any commitment from the given type group.
 *
 * @param commitmentTypes - All parsed commitment types from the source.
 * @param expectedCommitmentTypes - Commitment types that should trigger the warning.
 * @returns `true` when at least one matching commitment is present.
 */
function hasAnyCommitmentType(
    commitmentTypes: ReadonlySet<string>,
    expectedCommitmentTypes: ReadonlyArray<string>,
): boolean {
    return expectedCommitmentTypes.some((commitmentType) => commitmentTypes.has(commitmentType));
}

/**
 * Creates the warning text for the open/closed behavior.
 *
 * @param options - Flags describing whether the source is explicitly open or only implicitly open.
 * @returns Human-readable explanation for the `OPEN` warning row.
 */
function createOpenWarningDescription(options: {
    readonly isExplicitOpen: boolean;
    readonly isMissingClosed: boolean;
}): string {
    if (options.isExplicitOpen && options.isMissingClosed) {
        return 'The source uses `OPEN` and has no `CLOSED` commitment, so the open/closed behavior cannot be preserved 1:1 in exported code.';
    }

    if (options.isExplicitOpen) {
        return 'The source uses `OPEN`, so the open/closed behavior cannot be preserved 1:1 in exported code.';
    }

    return 'The source has no `CLOSED` commitment, so the agent is open by default and that behavior cannot be preserved 1:1 in exported code.';
}
