import { FileTextIcon, MessageSquareIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import { getVisibleCommitmentDefinitions } from '../../utils/getVisibleCommitmentDefinitions';
import type { SubMenuItem } from './SubMenuItem';

type DocumentationCommitmentGroup = ReturnType<typeof getVisibleCommitmentDefinitions>[number];

/**
 * Commitment types that should be visually highlighted in the documentation menu.
 *
 * @private internal constant of <Header/>
 */
const IMPORTANT_COMMITMENT_TYPES = [
    'PERSONA',
    'ROLE',
    'TEAM',
    'TASK',
    'GOAL',
    'LIMIT',
    'EXAMPLE',
    'RULE',
    'STYLE',
    'TONE',
    'FORMAT',
];

/**
 * Fast lookup set for highlighted commitment types.
 *
 * @private internal constant of <Header/>
 */
const IMPORTANT_COMMITMENT_TYPE_SET = new Set<string>(IMPORTANT_COMMITMENT_TYPES);

/**
 * Creates one visual label for a commitment entry in the documentation dropdown.
 *
 * @private function of <Header/>
 */
function createDocumentationCommitmentLabel(primary: { type: string }, aliases: string[]): ReactNode {
    const hasImportantType = IMPORTANT_COMMITMENT_TYPE_SET.has(primary.type);
    const icon = hasImportantType ? <MessageSquareIcon className="h-4 w-4 text-blue-500" /> : null;

    return (
        <span className="flex items-center gap-2">
            {icon}
            <span className={hasImportantType ? 'font-semibold text-gray-900' : undefined}>{aliases.join(' / ')}</span>
        </span>
    );
}

/**
 * Converts one commitment group to one dropdown menu item.
 *
 * @private function of <Header/>
 */
function createDocumentationCommitmentItem(group: DocumentationCommitmentGroup): SubMenuItem {
    const aliases = [group.primary.type, ...group.aliases];

    return {
        label: createDocumentationCommitmentLabel(group.primary, aliases),
        href: `/documentation/commitments/${encodeURIComponent(group.primary.type.toLowerCase())}`,
    };
}

/**
 * Builds the complete Documentation dropdown items list.
 *
 * @private function of <Header/>
 */
export function buildDocumentationDropdownItems(
    visibleDocumentationCommitments: ReadonlyArray<DocumentationCommitmentGroup>,
    translate: (key: ServerTranslationKey) => string,
): SubMenuItem[] {
    const commitmentItems = visibleDocumentationCommitments.map((group) => createDocumentationCommitmentItem(group));

    return [
        {
            label: (
                <span className="flex items-center gap-2 font-medium text-gray-900">
                    <FileTextIcon className="h-4 w-4 text-blue-500" />
                    <span>{translate('header.grammarTitle' as ServerTranslationKey)}</span>
                </span>
            ),
            href: '/documentation/book-language',
            isBold: true,
            isBordered: true,
        },
        ...commitmentItems,
    ];
}
