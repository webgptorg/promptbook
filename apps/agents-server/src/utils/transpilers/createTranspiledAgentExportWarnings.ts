import type { string_book } from '@promptbook-local/types';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { ParsedCommitment } from '../../../../../src/commitments/_base/ParsedCommitment';

/**
 * One warning shown on the export-as-transpiled-code page and returned by the export API.
 */
export type TranspiledAgentExportWarning = {
    /**
     * Canonical commitment or capability name that caused the warning.
     */
    readonly commitmentType: 'OPEN' | 'MODEL' | 'USE USER LOCATION' | 'USE PRIVACY';

    /**
     * Short human-friendly label shown in the warning list.
     */
    readonly title: string;

    /**
     * Longer explanation of why the functionality cannot be transpiled 1:1.
     */
    readonly description: string;
};

/**
 * Internal warning definition paired with a matcher.
 */
type TranspiledAgentExportWarningDefinition = {
    /**
     * Warning payload shown when the matcher returns `true`.
     */
    readonly warning: TranspiledAgentExportWarning;

    /**
     * Decides whether the warning applies to the parsed source.
     */
    readonly matches: (commitments: ReadonlyArray<ParsedCommitment>) => boolean;
};

/**
 * Commitment types that are effectively model-selection commitments.
 */
const MODEL_COMMITMENT_TYPES = ['MODEL', 'MODELS'] as const;

/**
 * Matching warnings for non-transpilable functionality.
 */
const TRANSPILATION_WARNING_DEFINITIONS: ReadonlyArray<TranspiledAgentExportWarningDefinition> = [
    {
        warning: {
            commitmentType: 'OPEN',
            title: 'Open / self-modifying behavior',
            description:
                'The agent is open to conversation-driven modification. This is the default when `CLOSED` is absent, so exported code cannot mirror it 1:1.',
        },
        matches: (commitments) => isAgentOpen(commitments),
    },
    {
        warning: {
            commitmentType: 'MODEL',
            title: 'Model selection',
            description:
                'The transpiler chooses the target model itself, so `MODEL` settings are not exported 1:1.',
        },
        matches: (commitments) => hasCommitmentType(commitments, MODEL_COMMITMENT_TYPES),
    },
    {
        warning: {
            commitmentType: 'USE USER LOCATION',
            title: 'Location access',
            description:
                'Browser location comes from the runtime environment, so `USE USER LOCATION` cannot be reproduced exactly in every transpiled export.',
        },
        matches: (commitments) => hasCommitmentType(commitments, ['USE USER LOCATION'] as const),
    },
    {
        warning: {
            commitmentType: 'USE PRIVACY',
            title: 'Private mode',
            description:
                'Private mode depends on the Agents Server runtime and user confirmation flow, so `USE PRIVACY` cannot be reproduced exactly in exported code.',
        },
        matches: (commitments) => hasCommitmentType(commitments, ['USE PRIVACY'] as const),
    },
] as const;

/**
 * Creates the export warnings for one resolved agent source.
 *
 * The warning list is intentionally transpiler-agnostic. It highlights source-level functionality
 * that depends on runtime behavior or export-time decisions instead of the Book source alone.
 *
 * @param agentSource - Resolved agent source after inheritance and imports have been applied.
 * @returns Warning descriptors for functionality that cannot be reproduced 1:1 by transpilers.
 */
export function createTranspiledAgentExportWarnings(agentSource: string_book): Array<TranspiledAgentExportWarning> {
    const parsedAgentSource = parseAgentSourceWithCommitments(agentSource);

    return TRANSPILATION_WARNING_DEFINITIONS.filter((definition) => definition.matches(parsedAgentSource.commitments)).map(
        (definition) => definition.warning,
    );
}

/**
 * Checks whether the resolved source is effectively open to conversation-driven modification.
 *
 * OPEN is the default behavior whenever the source does not end in `CLOSED`.
 *
 * @param commitments - Parsed commitments in source order.
 * @returns `true` when the agent can be modified by conversation.
 */
function isAgentOpen(commitments: ReadonlyArray<ParsedCommitment>): boolean {
    const lastCommitment = commitments[commitments.length - 1];
    return lastCommitment?.type !== 'CLOSED';
}

/**
 * Checks whether the parsed source contains at least one of the requested commitment types.
 *
 * @param commitments - Parsed commitments in source order.
 * @param commitmentTypes - Commitment types to look for.
 * @returns `true` when any of the requested commitments is present.
 */
function hasCommitmentType(
    commitments: ReadonlyArray<ParsedCommitment>,
    commitmentTypes: ReadonlyArray<ParsedCommitment['type']>,
): boolean {
    const commitmentTypeSet = new Set(commitmentTypes);
    return commitments.some((commitment) => commitmentTypeSet.has(commitment.type));
}
