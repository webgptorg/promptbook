import type { AgentsByServer } from '../../utils/getFederatedAgents';
import { AgentCard } from './AgentCard';
import { Section } from './Section';

type ExternalAgentsSectionProps = {
    agentsByServer: AgentsByServer[];
};

export function ExternalAgentsSection({ agentsByServer }: ExternalAgentsSectionProps) {
    return (
        <>
            {agentsByServer.map(({ serverUrl, agents }) => (
                <Section key={serverUrl} title={`Agents from ${serverUrl} (${agents.length})`}>
                    {agents.map((agent) => (
                        <AgentCard key={agent.url} agent={agent} href={agent.url} />
                    ))}
                </Section>
            ))}
        </>
    );
}
