import type { ReactNode } from 'react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Helper type describing grouped commitments after filtering out unimplemented ones.
 */
type DocumentationCommitmentGroup = {
    primary: { type: string };
    aliases: string[];
};

/**
 * Commitments that stay at the top level of the Documentation dropdown.
 */
const IMPORTANT_COMMITMENT_TYPES = [
    'PERSONA',
    'KNOWLEDGE',
    'GOAL',
    'TEAM',
    'CLOSED',
    'INITIAL MESSAGE',
    'USE SEARCH ENGINE',
] as const;

/**
 * Fast lookups for commits that must stay top-level.
 */
const IMPORTANT_COMMITMENT_TYPE_SET = new Set<string>(IMPORTANT_COMMITMENT_TYPES);

/**
 * Creates a label node that reuses the existing alias styling.
 *
 * @param primary Primary commitment definition.
 * @param aliases Additional alias names for the commitment.
 * @returns JSX node with the commitment type and aliases.
 */
function createDocumentationCommitmentLabel(primary: { type: string }, aliases: string[]): ReactNode {
    return (
        <>
            {primary.type}
            {aliases.length > 0 && <span className="text-gray-400 font-normal"> / {aliases.join(' / ')}</span>}
        </>
    );
}

/**
 * Maps a commitment group to a documentation submenu item.
 *
 * @param group Commitment metadata returned from the registry.
 * @returns Configured submenu item linking to the commitment page.
 */
function createDocumentationCommitmentItem(group: DocumentationCommitmentGroup): SubMenuItem {
    return {
        label: createDocumentationCommitmentLabel(group.primary, group.aliases),
        href: `/docs/${group.primary.type}`,
    };
}

/**
 * Builds the dropdown structure for the Documentation menu, highlighting important
 * commitments and nesting the rest under an "All" submenu.
 *
 * @param groups Visible commitment definitions.
 * @returns Ordered list of submenu items for the Documentation dropdown.
 * @private function of Header
 */
export function buildDocumentationDropdownItems(
    groups: ReadonlyArray<DocumentationCommitmentGroup>,
    translate: (key: ServerTranslationKey) => string,
): SubMenuItem[] {
    const commitmentByType = new Map<string, DocumentationCommitmentGroup>();
    groups.forEach((group) => {
        commitmentByType.set(group.primary.type, group);
    });

    const highlightedCommitments = IMPORTANT_COMMITMENT_TYPES.map((type) => commitmentByType.get(type)).filter(
        (group): group is DocumentationCommitmentGroup => Boolean(group),
    );

    const remainingCommitments = groups.filter((group) => !IMPORTANT_COMMITMENT_TYPE_SET.has(group.primary.type));

    const items: SubMenuItem[] = [
        {
            label: translate('header.documentationOverview'),
            href: '/docs',
            isBold: true,
            isBordered: true,
        },
        {
            label: translate('header.documentationApiReference'),
            href: '/swagger',
            isBold: true,
            isBordered: true,
        },
        ...highlightedCommitments.map(createDocumentationCommitmentItem),
    ];

    if (remainingCommitments.length > 0) {
        items.push({
            label: translate('header.documentationAll'),
            items: remainingCommitments.map(createDocumentationCommitmentItem),
        });
    }

    return items;
}
