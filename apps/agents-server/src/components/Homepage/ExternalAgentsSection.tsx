import type { AgentsByServer } from '../../utils/AgentsByServer';
import { AgentCard } from './AgentCard';
import { Section } from './Section';
import { formatAgentNamingText } from '../../utils/agentNaming';
import { getAgentNaming } from '../../utils/getAgentNaming';

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

export async function ExternalAgentsSection(props: ExternalAgentsSectionProps) {
    const { agentsByServer, publicUrl } = props;
    const agentNaming = await getAgentNaming();
    return (
        <>
            {agentsByServer.map(({ serverUrl, agents }) => (
                <Section
                    key={serverUrl}
                    title={`${formatAgentNamingText('Agents from', agentNaming)} ${new URL(serverUrl).hostname} (${
                        agents.length
                    })`}
                >
                    {agents.map((agent) => (
                        <AgentCard key={agent.url} agent={agent} href={agent.url} publicUrl={publicUrl.href} />
                    ))}
                </Section>
            ))}
        </>
    );
}
