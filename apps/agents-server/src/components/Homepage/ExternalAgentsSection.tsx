import type { AgentsByServer } from '../../utils/AgentsByServer';
import { AgentCardsSection } from './AgentCardsSection';
import { formatAgentNamingText } from '../../utils/agentNaming';
import { getAgentNaming } from '../../utils/getAgentNaming';
import { getServerHeadingLabel } from './getServerHeadingLabel';

/**
 * Props for external agents section.
 */
type ExternalAgentsSectionProps = {
    /**
     * Agents grouped by their originating server for federated display
     */
    readonly agentsByServer: AgentsByServer[];

    /**
     * Base URL of the agents server
     */
    readonly publicUrl: URL;
};

/**
 * Handles external agents section.
 */
export async function ExternalAgentsSection(props: ExternalAgentsSectionProps) {
    const { agentsByServer, publicUrl } = props;
    const agentNaming = await getAgentNaming();
    return (
        <>
            {agentsByServer.map(({ serverUrl, agents }) => (
                <AgentCardsSection
                    key={serverUrl}
                    title={`${formatAgentNamingText('Agents from', agentNaming)} ${getServerHeadingLabel(serverUrl)} (${
                        agents.length
                    })`}
                    publicUrl={publicUrl.href}
                    agents={agents}
                    hideWhenEmpty={true}
                />
            ))}
        </>
    );
}
