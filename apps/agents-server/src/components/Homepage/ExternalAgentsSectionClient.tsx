'use client';

import { AgentCard } from './AgentCard';
import { AgentCardsLoadingSkeleton } from '../Skeleton/AgentCardsLoadingSkeleton';
import { Section } from './Section';
import { HOMEPAGE_AGENT_GRID_CLASS } from './gridLayout';
import { string_url } from '@promptbook-local/types';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';
import { useFederatedAgentSections } from './useFederatedAgentSections';

/**
 * Props for external agents section client.
 */
type ExternalAgentsSectionClientProps = {
    /**
     * Base URL of the agents server
     * 
     * Note: [👭] Using `string_url`, not `URL` object because we are passing prop from server to client. 
     */
    readonly publicUrl: string_url
};

/**
 * Number of skeleton cards shown while one federated server section loads.
 */
const FEDERATED_SERVER_LOADING_CARD_COUNT = 4;

/**
 * Handles external agents section client.
 */
export function ExternalAgentsSectionClient(props: ExternalAgentsSectionClientProps) {
    const { publicUrl } = props;
    const { isLoading, sections } = useFederatedAgentSections();
    const { formatText } = useAgentNaming();

    if (isLoading) {
        return (
            <div className="mt-8" role="status" aria-live="polite" aria-busy="true" aria-label="Loading federated agents">
                <Section
                    title={formatText('Federated agents')}
                    gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                >
                    <AgentCardsLoadingSkeleton cardCount={FEDERATED_SERVER_LOADING_CARD_COUNT} />
                </Section>
            </div>
        );
    }

    if (sections.length === 0) {
        return null;
    }

    return (
        <>
            {sections.map((section) => {
                const { serverUrl } = section;
                const hostname = (() => {
                    try {
                        return new URL(serverUrl).hostname;
                    } catch {
                        return serverUrl;
                    }
                })();

                if (section.status === 'loading') {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (...)`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            <AgentCardsLoadingSkeleton cardCount={FEDERATED_SERVER_LOADING_CARD_COUNT} />
                        </Section>
                    );
                }

                if (section.status === 'error') {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (Error)`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            <div className="py-4 text-sm text-red-500 text-center">
                                {formatText('Failed to load agents from this server.')}
                            </div>
                        </Section>
                    );
                }

                if (section.status === 'success' && section.agents.length > 0) {
                    return (
                        <Section
                            key={serverUrl}
                            title={`${formatText('Agents from')} ${hostname} (${section.agents.length})`}
                            gridClassName={HOMEPAGE_AGENT_GRID_CLASS}
                        >
                            {section.agents.map((agent) => (
                                <AgentCard
                                    key={agent.url}
                                    agent={agent}
                                    href={agent.url}
                                    publicUrl={publicUrl}
                                    serverUrl={serverUrl}
                                />
                            ))}
                        </Section>
                    );
                }

                // Hide sections with no agents if successfully loaded
                return null;
            })}
        </>
    );
}
