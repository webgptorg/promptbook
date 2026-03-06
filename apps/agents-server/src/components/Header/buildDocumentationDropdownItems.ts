import type { ReactNode } from 'react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import type { SubMenuItem } from './HeaderMenuTypes';

/**
 * @private Describes one of the grouped commitment definitions visible in the documentation dropdown.
 */
type DocumentationCommitmentGroup = ReturnType<typeof getVisibleCommitmentDefinitions>[number];

/**
 * @private Focused commitment entries that should stay on the root level of the documentation menu.
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
 * @private Fast lookup that keeps important commitment types at the top level.
 */
const IMPORTANT_COMMITMENT_TYPE_SET = new Set<string>(IMPORTANT_COMMITMENT_TYPES);

/**
 * @private function of Header
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
 * @private function of Header
 */
function createDocumentationCommitmentItem(group: DocumentationCommitmentGroup): SubMenuItem {
    return {
        label: createDocumentationCommitmentLabel(group.primary, group.aliases),
        href: `/docs/${group.primary.type}`,
    };
}

/**
 * @private Builds the submenu items displayed inside the Documentation dropdown.
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
