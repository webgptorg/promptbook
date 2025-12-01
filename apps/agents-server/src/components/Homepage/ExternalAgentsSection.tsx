import type { AgentsByServer } from '../../utils/getFederatedAgents';
import { AgentCard } from './AgentCard';

type ExternalAgentsSectionProps = {
    agentsByServer: AgentsByServer[];
};

export function ExternalAgentsSection({ agentsByServer }: ExternalAgentsSectionProps) {
    const totalAgents = agentsByServer.reduce((sum, server) => sum + server.agents.length, 0);

    if (totalAgents === 0) {
        return null;
    }

    return (
        <section className="mt-16 first:mt-4 mb-4">
            <h2 className="text-3xl text-gray-900 mb-6 font-light">External Agents ({totalAgents})</h2>
            {agentsByServer.map(({ serverUrl, agents }) => (
                <div key={serverUrl} className="mb-8 last:mb-0">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">From {serverUrl}</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {agents.map((agent) => (
                            <AgentCard key={agent.url} agent={agent} href={agent.url} />
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
}
