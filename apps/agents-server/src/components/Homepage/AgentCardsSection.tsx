import type { string_url } from '@promptbook-local/types';
import { AlertCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { AgentCardsLoadingSkeleton } from '../Skeleton/AgentCardsLoadingSkeleton';
import { AgentCard } from './AgentCard';
import { HOMEPAGE_AGENT_GRID_CLASS } from './gridLayout';
import { Section } from './Section';

/**
 * Agent shape rendered by the shared homepage-like card section.
 *
 * @private internal helper type of <AgentCardsSection/>.
 */
type AgentCardsSectionBaseAgent = AgentBasicInformation & {
    /**
     * Primary entry URL of the rendered agent.
     */
    readonly url?: string;

    /**
     * Canonical base URL of the server hosting the agent.
     */
    readonly serverUrl?: string;
};

/**
 * Props for the shared homepage-like agent-card section.
 *
 * @private internal helper type of <AgentCardsSection/>.
 */
type AgentCardsSectionProps<TAgent extends AgentCardsSectionBaseAgent> = {
    /**
     * Visible section heading.
     */
    readonly title: ReactNode;

    /**
     * Current public server URL passed to shared agent cards.
     */
    readonly publicUrl: string_url;

    /**
     * Agents rendered inside the section grid.
     */
    readonly agents: ReadonlyArray<TAgent>;

    /**
     * Whether the section should render loading skeleton cards.
     */
    readonly isLoading?: boolean;

    /**
     * Optional load error shown instead of the card grid.
     */
    readonly errorMessage?: string;

    /**
     * Empty-state copy shown when the section is intentionally rendered without agents.
     */
    readonly emptyLabel?: string;

    /**
     * When true, omit the entire section instead of showing an empty state.
     */
    readonly hideWhenEmpty?: boolean;

    /**
     * Number of loading skeleton cards shown while `isLoading` is true.
     */
    readonly loadingCardCount?: number;

    /**
     * Optional selectable-card callback. When omitted, cards navigate to their URLs.
     */
    readonly onSelectAgent?: (agent: TAgent) => void;

    /**
     * Returns whether the given card should render as selected.
     */
    readonly isAgentSelected?: (agent: TAgent) => boolean;

    /**
     * Badge text shown on selected cards.
     */
    readonly selectionStateLabel?: string;

    /**
     * Optional section class overrides appended after the shared defaults.
     */
    readonly sectionClassName?: string;

    /**
     * Optional heading class overrides appended after the shared defaults.
     */
    readonly titleClassName?: string;
};

/**
 * Homepage-like section wrapper shared by federated-agent lists and wizard pickers.
 *
 * @param props - Section props.
 * @returns Card section with loading, error, empty, or agent-card content.
 *
 * @private internal shared helper for homepage-style agent grids.
 */
export function AgentCardsSection<TAgent extends AgentCardsSectionBaseAgent>({
    title,
    publicUrl,
    agents,
    isLoading = false,
    errorMessage,
    emptyLabel,
    hideWhenEmpty = false,
    loadingCardCount = 4,
    onSelectAgent,
    isAgentSelected,
    selectionStateLabel,
    sectionClassName,
    titleClassName,
}: AgentCardsSectionProps<TAgent>) {
    const shouldHideEmptyState = !isLoading && !errorMessage && agents.length === 0 && (hideWhenEmpty || !emptyLabel);

    if (shouldHideEmptyState) {
        return null;
    }

    return (
        <Section
            title={title}
            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
            sectionClassName={sectionClassName}
            titleClassName={titleClassName}
        >
            {isLoading ? (
                <AgentCardsLoadingSkeleton cardCount={loadingCardCount} />
            ) : errorMessage ? (
                <div className="col-span-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                    <div className="flex items-start gap-2">
                        <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <div>{errorMessage}</div>
                    </div>
                </div>
            ) : agents.length === 0 ? (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                    {emptyLabel}
                </div>
            ) : (
                agents.map((agent) => {
                    const agentCardKey = agent.url || agent.permanentId || agent.agentName;

                    return (
                        <AgentCard
                            key={agentCardKey}
                            agent={agent}
                            href={typeof onSelectAgent === 'function' ? undefined : agent.url}
                            publicUrl={publicUrl}
                            serverUrl={agent.serverUrl}
                            onSelect={
                                typeof onSelectAgent === 'function'
                                    ? () => {
                                          onSelectAgent(agent);
                                      }
                                    : undefined
                            }
                            isSelected={isAgentSelected?.(agent)}
                            selectionStateLabel={selectionStateLabel}
                        />
                    );
                })
            )}
        </Section>
    );
}
