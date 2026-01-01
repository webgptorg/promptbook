import type { AgentsByServer } from '../../utils/AgentsByServer';
import { AgentCard } from './AgentCard';
import { Section } from './Section';

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

export function ExternalAgentsSection(props: ExternalAgentsSectionProps) {
    const { agentsByServer, publicUrl } = props;
    return (
        <>
            {agentsByServer.map(({ serverUrl, agents }) => (
                <Section key={serverUrl} title={`Agents from ${new URL(serverUrl).hostname} (${agents.length})`}>
                    {agents.map((agent) => (
                        <AgentCard key={agent.url} agent={agent} href={agent.url} publicUrl={publicUrl} />
                    ))}
                </Section>
            ))}
        </>
    );
}
