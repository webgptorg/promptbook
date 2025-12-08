import React, { useState, useEffect } from 'react';
import { BookEditor } from '../BookEditor/BookEditor';
import { AgentProfile } from '../AgentProfile/AgentProfile';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import type { Agent } from '../../llm-providers/agent/Agent';

type PromptbookAgentFormfactor = 'seamless' | 'book' | 'chat' | 'profile';

export type PromptbookAgentProps = {
    agentUrl: string;
    formfactor?: PromptbookAgentFormfactor;
    // ...other props...
};

export function PromptbookAgent(props: PromptbookAgentProps) {
    const { agentUrl, formfactor = 'seamless', ...rest } = props;
    const [agent, setAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        RemoteAgent.connect({ agentUrl })
            .then((a) => {
                if (!cancelled) {
                    setAgent(a);
                    setLoading(false);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e.message || 'Failed to connect to agent');
                    setLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [agentUrl]);

    if (loading) return <div>Loading agent...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!agent) return null;

    switch (formfactor) {
        case 'book':
            return <BookEditor agentSource={agent.agentSource.value} {...rest} />;
        case 'chat':
            return <AgentChat agent={agent} {...rest} />;
        case 'profile':
            return <AgentProfile agent={agent} {...rest} />;
        case 'seamless':
        default:
            // ...existing seamless floating chat logic...
            return (
                <div>
                    {/* TODO: Insert existing seamless UI here, using agent */}
                    <AgentChat agent={agent} {...rest} />
                </div>
            );
    }
}
