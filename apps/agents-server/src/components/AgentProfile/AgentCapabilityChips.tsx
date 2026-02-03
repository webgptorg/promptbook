import { AgentBasicInformation, AgentCapability } from '@promptbook-local/types';
import {
    Book,
    Clock8Icon,
    ExternalLink,
    FileText,
    Globe,
    Link,
    Search,
    ShieldAlert,
    ShieldQuestionMarkIcon,
    SquareArrowOutUpRight,
    SquareArrowUpRight,
    Users,
} from 'lucide-react';
import NextLink from 'next/link';
import { TeamCommitmentChip } from './TeamCommitmentChip';

/**
 * Maximum number of capability chips shown on homepage agent cards.
 */
export const HOMEPAGE_CAPABILITY_CHIPS_LIMIT = 3;

/**
 * Maximum number of capability chips shown on agent profile pages.
 */
export const AGENT_PROFILE_CAPABILITY_CHIPS_LIMIT = 7;

const MAX_INDIVIDUAL_KNOWLEDGE_CHIPS = 2;

const CAPABILITY_PRIORITY_BUCKETS: ReadonlyArray<ReadonlyArray<AgentCapability['type']>> = [
    ['team'],
    ['inheritance', 'import'],
    ['browser', 'search-engine', 'time', 'image-generator', 'email'],
    ['knowledge'],
];

/**
 * Props for AgentCapabilityChips.
 */
type AgentCapabilityChipsProps = {
    /**
     * The agent whose capabilities should be displayed.
     */
    readonly agent: AgentBasicInformation;

    /**
     * Optional CSS class name overrides for the chip container.
     */
    readonly className?: string;

    /**
     * Maximum number of chips to show after prioritization and grouping.
     */
    readonly maxChips?: number;

    /**
     * Visual size preset for chip rendering.
     */
    readonly size?: AgentCapabilityChipsSize;
};

/**
 * Size options for capability chips.
 */
type AgentCapabilityChipsSize = 'default' | 'compact';

/**
 * Capability with original ordering metadata for stable sorting.
 */
type OrderedCapability = {
    /**
     * The capability to display.
     */
    readonly capability: AgentCapability;

    /**
     * Original order index from the capability list.
     */
    readonly order: number;
};

/**
 * Render capability chips for an agent with priority, grouping, and limits.
 */
export function AgentCapabilityChips({ agent, className, maxChips, size = 'default' }: AgentCapabilityChipsProps) {
    if (!agent.capabilities || agent.capabilities.length === 0) {
        return null;
    }

    const maxChipsToDisplay = maxChips ?? AGENT_PROFILE_CAPABILITY_CHIPS_LIMIT;
    const displayedCapabilities = selectCapabilitiesForDisplay(agent.capabilities, maxChipsToDisplay);

    if (displayedCapabilities.length === 0) {
        return null;
    }

    const containerGapClass = size === 'compact' ? 'gap-1.5' : 'gap-2';
    const chipPaddingClass = size === 'compact' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
    const iconSizeClass = size === 'compact' ? 'w-3 h-3' : 'w-3.5 h-3.5';

    return (
        <div className={`flex flex-wrap ${containerGapClass} ${className || ''}`}>
            {displayedCapabilities.map((capability, i) => {
                let href: string | undefined;

                if (capability.agentUrl) {
                    href = capability.agentUrl;

                    if (href.startsWith('./') || href.startsWith('../')) {
                        // [??] How to resolve relative paths?
                        // For now let's assume they are relative to /agents/
                        href = `/agents/${href.split('/').pop()}`;
                    } else if (href.startsWith('/')) {
                        href = `/agents${href}`;
                    }
                }

                if (capability.iconName === 'Users' && href) {
                    const content = <TeamCommitmentChip url={href} label={capability.label} size={size} />;

                    return (
                        <NextLink
                            key={i}
                            href={href}
                            className="no-underline"
                            onClick={(e) => {
                                // Note: Prevent card click when clicking on the chip
                                e.stopPropagation();
                            }}
                        >
                            {content}
                        </NextLink>
                    );
                }

                const Icon =
                    {
                        Globe,
                        Search,
                        Book,
                        FileText,
                        Clock: Clock8Icon,
                        SquareArrowOutUpRight,
                        SquareArrowUpRight,
                        ShieldAlert,
                        ExternalLink,
                        Link,
                        Users,
                        // <- [??] Add icons for new capabilities here
                    }[capability.iconName] || ShieldQuestionMarkIcon;

                const content = (
                    <div
                        key={i}
                        className={`flex items-center gap-1.5 bg-white/50 backdrop-blur-sm rounded-full font-semibold text-gray-800 border border-white/20 shadow-sm ${chipPaddingClass}`}
                        title={capability.label}
                    >
                        <Icon className={`${iconSizeClass} opacity-70`} />
                        <span className="truncate max-w-[150px]">{capability.label}</span>
                    </div>
                );

                if (href) {
                    return (
                        <NextLink
                            key={i}
                            href={href}
                            className="no-underline"
                            onClick={(e) => {
                                // Note: Prevent card click when clicking on the chip
                                e.stopPropagation();
                            }}
                        >
                            {content}
                        </NextLink>
                    );
                }

                return content;
            })}
        </div>
    );
}

/**
 * Selects capabilities for display, applying priority and grouping rules.
 *
 * @param capabilities - Raw capability list from the agent.
 * @param maxChips - Maximum number of chips to display.
 * @returns Capabilities to render in the UI.
 */
function selectCapabilitiesForDisplay(
    capabilities: Array<AgentCapability>,
    maxChips: number,
): Array<AgentCapability> {
    if (maxChips <= 0) {
        return [];
    }

    const normalizedCapabilities = normalizeCapabilities(capabilities);
    const groupedCapabilities = groupKnowledgeCapabilities(normalizedCapabilities);
    const prioritizedCapabilities = groupedCapabilities
        .map((item, index) => ({
            ...item,
            priority: getCapabilityPriorityBucket(item.capability),
            tieBreaker: index,
        }))
        .sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            if (a.order !== b.order) {
                return a.order - b.order;
            }

            return a.tieBreaker - b.tieBreaker;
        })
        .map((item) => item.capability);

    return prioritizedCapabilities.slice(0, maxChips);
}

/**
 * Filters unsupported or duplicate capabilities while preserving order metadata.
 *
 * @param capabilities - Raw capability list from the agent.
 * @returns Normalized capabilities with ordering metadata.
 */
function normalizeCapabilities(capabilities: Array<AgentCapability>): Array<OrderedCapability> {
    return capabilities
        .map((capability, index) => ({ capability, order: index }))
        .filter((item) => {
            if (item.capability.type === 'inheritance' && item.capability.agentUrl === 'VOID') {
                return false;
            }

            return true;
        })
        .filter((item, index, self) => {
            if (item.capability.type !== 'knowledge') {
                return true;
            }

            return (
                index ===
                self.findIndex(
                    (entry) =>
                        entry.capability.type === 'knowledge' && entry.capability.label === item.capability.label,
                )
            );
        });
}

/**
 * Collapses multiple knowledge sources into grouped chips when they are numerous.
 *
 * @param capabilities - Normalized capabilities with ordering metadata.
 * @returns Capabilities with grouped knowledge entries.
 */
function groupKnowledgeCapabilities(capabilities: Array<OrderedCapability>): Array<OrderedCapability> {
    const knowledgeCapabilities = capabilities.filter((item) => item.capability.type === 'knowledge');

    if (knowledgeCapabilities.length === 0) {
        return capabilities;
    }

    const nonKnowledgeCapabilities = capabilities.filter((item) => item.capability.type !== 'knowledge');
    const pdfKnowledgeCapabilities = knowledgeCapabilities.filter((item) =>
        isPdfKnowledgeCapability(item.capability),
    );
    const textKnowledgeCapabilities = knowledgeCapabilities.filter(
        (item) => !isPdfKnowledgeCapability(item.capability),
    );

    return [
        ...nonKnowledgeCapabilities,
        ...groupKnowledgeItems(pdfKnowledgeCapabilities, 'PDFs', 'FileText'),
        ...groupKnowledgeItems(textKnowledgeCapabilities, 'Knowledge', 'Book'),
    ];
}

/**
 * Groups knowledge items into a single chip when they exceed the display threshold.
 *
 * @param items - Knowledge items to group.
 * @param labelPrefix - Label prefix to use for grouped chips.
 * @param iconName - Icon name to display for grouped chips.
 * @returns Grouped or original knowledge items.
 */
function groupKnowledgeItems(
    items: Array<OrderedCapability>,
    labelPrefix: string,
    iconName: AgentCapability['iconName'],
): Array<OrderedCapability> {
    if (items.length <= MAX_INDIVIDUAL_KNOWLEDGE_CHIPS) {
        return items;
    }

    const earliestOrder = Math.min(...items.map((item) => item.order));

    return [
        {
            capability: createGroupedKnowledgeCapability(labelPrefix, items.length, iconName),
            order: earliestOrder,
        },
    ];
}

/**
 * Determines if a knowledge capability points to a PDF source.
 *
 * @param capability - Capability to inspect.
 * @returns True if the capability represents a PDF knowledge source.
 */
function isPdfKnowledgeCapability(capability: AgentCapability): boolean {
    if (capability.type !== 'knowledge') {
        return false;
    }

    return capability.iconName === 'FileText' || capability.label.toLowerCase().endsWith('.pdf');
}

/**
 * Builds a grouped knowledge capability with a count label.
 *
 * @param labelPrefix - Prefix for the grouped label.
 * @param count - Number of grouped items.
 * @param iconName - Icon name for the grouped chip.
 * @returns Grouped knowledge capability.
 */
function createGroupedKnowledgeCapability(
    labelPrefix: string,
    count: number,
    iconName: AgentCapability['iconName'],
): AgentCapability {
    return {
        type: 'knowledge',
        label: `${labelPrefix} (${count})`,
        iconName,
    };
}

/**
 * Maps a capability to a priority bucket index for sorting.
 *
 * @param capability - Capability to score.
 * @returns Bucket index, where lower values are higher priority.
 */
function getCapabilityPriorityBucket(capability: AgentCapability): number {
    const bucketIndex = CAPABILITY_PRIORITY_BUCKETS.findIndex((bucket) => bucket.includes(capability.type));

    if (bucketIndex === -1) {
        return CAPABILITY_PRIORITY_BUCKETS.length - 1;
    }

    return bucketIndex;
}
