import type { CommitmentDefinition } from '../_base/CommitmentDefinition';

/**
 * Type of commitment notice surfaced in docs and editor UI.
 *
 * @private internal type of commitment catalog presentation
 */
export type CommitmentNoticeMetadata = {
    /**
     * Machine-readable notice kind.
     */
    readonly kind: 'deprecated' | 'unfinished';

    /**
     * Short badge label shown in documentation and menus.
     */
    readonly badgeLabel: string;

    /**
     * Longer label used in documentation bodies and editor details.
     */
    readonly detailLabel: string;

    /**
     * Human-readable notice message shown in editor and documentation callouts.
     */
    readonly message: string;
};

/**
 * Low-level warning message used for unfinished commitments.
 */
const UNFINISHED_COMMITMENT_MESSAGE =
    'This commitment is unfinished and not ready to use. Be careful when using it.';

/**
 * Short badge text used for deprecated commitments.
 */
const DEPRECATED_COMMITMENT_BADGE_LABEL = 'Deprecated';

/**
 * Short badge text used for unfinished commitments.
 */
const LOW_LEVEL_COMMITMENT_BADGE_LABEL = 'Low-level';

/**
 * Longer label used for deprecated commitments.
 */
const DEPRECATED_COMMITMENT_DETAIL_LABEL = 'Deprecated commitment';

/**
 * Longer label used for unfinished commitments.
 */
const LOW_LEVEL_COMMITMENT_DETAIL_LABEL = 'Low-level commitment';

/**
 * Prefix used when formatting replacement guidance.
 */
const PREFERRED_REPLACEMENT_LABEL = 'Preferred replacement';

/**
 * Formats preferred replacement guidance for deprecated commitments.
 *
 * @param replacedBy - Preferred replacement commitment keywords.
 * @returns Optional replacement guidance sentence with leading space.
 *
 * @private internal utility of commitment catalog notices
 */
export function formatCommitmentReplacementText(replacedBy?: ReadonlyArray<string>): string {
    if (!replacedBy || replacedBy.length === 0) {
        return '';
    }

    return ` ${PREFERRED_REPLACEMENT_LABEL}: ${replacedBy.map((type) => `\`${type}\``).join(', ')}.`;
}

/**
 * Resolves the notice metadata for deprecated or unfinished commitments.
 *
 * @param definition - Commitment definition to inspect.
 * @returns Notice metadata when the commitment should be surfaced with caution.
 *
 * @private internal utility of commitment catalog notices
 */
export function getCommitmentNoticeMetadata(
    definition: Pick<CommitmentDefinition, 'deprecation'> &
        Partial<Pick<CommitmentDefinition, 'isUnfinished'>>,
): CommitmentNoticeMetadata | null {
    if (definition.isUnfinished) {
        return {
            kind: 'unfinished',
            badgeLabel: LOW_LEVEL_COMMITMENT_BADGE_LABEL,
            detailLabel: LOW_LEVEL_COMMITMENT_DETAIL_LABEL,
            message: UNFINISHED_COMMITMENT_MESSAGE,
        };
    }

    if (definition.deprecation) {
        return {
            kind: 'deprecated',
            badgeLabel: DEPRECATED_COMMITMENT_BADGE_LABEL,
            detailLabel: DEPRECATED_COMMITMENT_DETAIL_LABEL,
            message: definition.deprecation.message,
        };
    }

    return null;
}
