import {
    Asterisk,
    BadgeCheck,
    BellRing,
    BookCopy,
    BookMarked,
    BookOpenText,
    BookText,
    BotMessageSquare,
    Braces,
    Brain,
    Brush,
    CalendarDays,
    CircleGauge,
    ClipboardCheck,
    ClipboardList,
    Clock3,
    CodeXml,
    Component,
    ContactRound,
    DatabaseZap,
    DraftingCompass,
    Eye,
    FileArchive,
    FileAudio,
    FileCog,
    FileInput,
    FilePenLine,
    FileQuestion,
    FileText,
    Fingerprint,
    Flag,
    FolderInput,
    Gem,
    Globe,
    Goal,
    Handshake,
    History,
    Image,
    Languages,
    Link,
    ListChecks,
    ListTree,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    MessageSquare,
    Mic,
    MousePointerClick,
    Network,
    Palette,
    PenLine,
    Puzzle,
    Radar,
    ReceiptText,
    Search,
    Send,
    Shield,
    Sparkles,
    SquareMousePointer,
    Tags,
    TerminalSquare,
    TextCursorInput,
    Trash2,
    UsersRound,
    WalletCards,
    WandSparkles,
    Waypoints,
    Workflow,
    type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';
import {
    getCommitmentNoticeMetadata,
    isLowVisibilityCommitmentNotice,
} from '../../../../../src/commitments/_common/getCommitmentNoticeMetadata';
import type { SubMenuItem } from './SubMenuItem';

/**
 * Helper type describing grouped commitments after filtering out unimplemented ones.
 */
type DocumentationCommitmentGroup = {
    primary: { type: string; isImportant: boolean; isUnfinished: boolean };
    aliases: string[];
};

/**
 * Dedicated icons for fixed Documentation dropdown entries.
 */
const DOCUMENTATION_OVERVIEW_ICON = BookOpenText;

/**
 * Dedicated icon for OpenAPI reference entry.
 */
const DOCUMENTATION_API_REFERENCE_ICON = Braces;

/**
 * Dedicated icon for the "All" Documentation submenu.
 */
const DOCUMENTATION_ALL_ICON = ListTree;

/**
 * Reusable unique icon pool assigned to commitment documentation entries in registry order.
 */
const DOCUMENTATION_COMMITMENT_ICONS: ReadonlyArray<LucideIcon> = [
    Goal,
    ListChecks,
    Brain,
    Handshake,
    ContactRound,
    BookText,
    ClipboardCheck,
    Languages,
    Mic,
    PenLine,
    Brush,
    FileText,
    FilePenLine,
    FileArchive,
    FolderInput,
    BotMessageSquare,
    Component,
    Image,
    Palette,
    TextCursorInput,
    Link,
    Globe,
    Shield,
    Eye,
    FileCog,
    FileAudio,
    BadgeCheck,
    BellRing,
    MessageSquare,
    Send,
    MousePointerClick,
    Puzzle,
    Tags,
    WalletCards,
    DraftingCompass,
    Trash2,
    BookCopy,
    Lock,
    UsersRound,
    Radar,
    Search,
    Sparkles,
    Workflow,
    Clock3,
    MapPin,
    CalendarDays,
    Mail,
    SquareMousePointer,
    WandSparkles,
    Network,
    Fingerprint,
    DatabaseZap,
    Asterisk,
    CircleGauge,
    ClipboardList,
    CodeXml,
    FileInput,
    FileQuestion,
    Flag,
    Gem,
    History,
    MessageCircle,
    ReceiptText,
    TerminalSquare,
    Waypoints,
    BookMarked,
];

/**
 * Creates a label node that reuses the existing alias styling.
 *
 * @param primary Primary commitment definition.
 * @param aliases Additional alias names for the commitment.
 * @returns JSX node with the commitment type and aliases.
 */
function createDocumentationCommitmentLabel(
    primary: { type: string },
    aliases: string[],
    isLowVisibility: boolean,
    badgeLabel?: string,
): ReactNode {
    return (
        <span className={`inline-flex items-center gap-2 ${isLowVisibility ? 'opacity-70' : ''}`}>
            <span>{primary.type}</span>
            {aliases.length > 0 && <span className="text-gray-400 font-normal"> / {aliases.join(' / ')}</span>}
            {isLowVisibility && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                    {badgeLabel}
                </span>
            )}
        </span>
    );
}

/**
 * Assigns commitment documentation icons from one shared pool.
 */
function createDocumentationCommitmentIconByType(
    groups: ReadonlyArray<DocumentationCommitmentGroup>,
): ReadonlyMap<string, LucideIcon> {
    const iconByType = new Map<string, LucideIcon>();

    groups.forEach((group, index) => {
        const icon = DOCUMENTATION_COMMITMENT_ICONS[index];
        if (icon) {
            iconByType.set(group.primary.type, icon);
        }
    });

    return iconByType;
}

/**
 * Resolves the icon for one commitment documentation entry.
 */
function resolveDocumentationCommitmentIcon(
    group: DocumentationCommitmentGroup,
    iconByType: ReadonlyMap<string, LucideIcon>,
): LucideIcon {
    return iconByType.get(group.primary.type) ?? FileQuestion;
}

/**
 * Maps a commitment group to a documentation submenu item.
 *
 * @param group Commitment metadata returned from the registry.
 * @returns Configured submenu item linking to the commitment page.
 */
function createDocumentationCommitmentItem(
    group: DocumentationCommitmentGroup,
    iconByType: ReadonlyMap<string, LucideIcon>,
): SubMenuItem {
    const notice = getCommitmentNoticeMetadata(group.primary);
    const isLowVisibilityNotice = isLowVisibilityCommitmentNotice(notice);

    return {
        icon: resolveDocumentationCommitmentIcon(group, iconByType),
        label: createDocumentationCommitmentLabel(
            group.primary,
            group.aliases,
            isLowVisibilityNotice,
            notice?.badgeLabel,
        ),
        href: `/docs/${group.primary.type}`,
    };
}

/**
 * Builds the dropdown structure for the Documentation menu, highlighting important
 * commitments and nesting the rest under an "All" submenu.
 *
 * @param groups Visible commitment definitions.
 * @returns Ordered list of submenu items for the Documentation dropdown.
 *
 * @private function of Header
 */
export function buildDocumentationDropdownItems(
    groups: ReadonlyArray<DocumentationCommitmentGroup>,
    translate: (key: ServerTranslationKey) => string,
): SubMenuItem[] {
    const highlightedCommitments = groups.filter((group) => group.primary.isImportant);
    const remainingCommitments = groups.filter((group) => !group.primary.isImportant);
    const iconByType = createDocumentationCommitmentIconByType(groups);

    const items: SubMenuItem[] = [
        {
            icon: DOCUMENTATION_OVERVIEW_ICON,
            label: translate('header.documentationOverview'),
            href: '/docs',
            isBold: true,
            isBordered: true,
        },
        {
            icon: DOCUMENTATION_API_REFERENCE_ICON,
            label: translate('header.documentationApiReference'),
            href: '/swagger',
            isBold: true,
            isBordered: true,
        },
        ...highlightedCommitments.map((group) => createDocumentationCommitmentItem(group, iconByType)),
    ];

    if (remainingCommitments.length > 0) {
        items.push({
            icon: DOCUMENTATION_ALL_ICON,
            label: translate('header.documentationAll'),
            items: remainingCommitments.map((group) => createDocumentationCommitmentItem(group, iconByType)),
        });
    }

    return items;
}
