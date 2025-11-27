'use client';

import { useEffect, useState } from 'react';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import './PromptbookAgent.css';

type PromptbookAgentProps = {
    /**
     * URL of the agent to connect to
     *
     * @example "http://s6.ptbk.io/benjamin-white"
     */
    agentUrl: string;

    /**
     * Callback when the window is opened or closed
     */
    onOpenChange?: (isOpen: boolean) => void;
};

/**
 * Renders a floating agent button that opens a chat window with the remote agent.
 *
 * @public exported from `@promptbook/components`
 */
export function PromptbookAgent(props: PromptbookAgentProps) {
    const { agentUrl, onOpenChange } = props;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);
    const [agent, setAgent] = useState<RemoteAgent | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const connectToAgent = async () => {
            try {
                // TODO: [🧠] Maybe we should not connect immediately but only when the user clicks the button or hovers?
                //            But for now, to have a fast response when clicking, we connect immediately.
                const connectedAgent = await RemoteAgent.connect({ agentUrl });
                if (isMounted) {
                    setAgent(connectedAgent);
                }
            } catch (err) {
                console.error('Failed to connect to agent:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                }
            }
        };

        connectToAgent();

        return () => {
            isMounted = false;
        };
    }, [agentUrl]);

    // TODO: [🧠] Handle loading state better (show spinner or skeleton in the chat window)
    // TODO: [🧠] Handle error state (show error message in the chat window)

    return (
        <div className={`promptbook-agent ${isOpen ? 'open' : 'closed'}`}>
            <div className="promptbook-agent-button" onClick={() => setIsOpen(!isOpen)}>
                <div className="promptbook-agent-avatar">
                    {/* TODO: Use agent avatar if available */}
                    <img
                        src={
                            agent?.meta?.image ||
                            'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
                        }
                        alt="Agent"
                    />
                </div>
                <div className="promptbook-agent-label">CHAT</div>
            </div>

            {isOpen && (
                <div className="promptbook-agent-window">
                    <div className="promptbook-agent-header">
                        <div className="promptbook-agent-title">{agent?.agentName || 'Chat with Agent'}</div>
                        <button className="promptbook-agent-close" onClick={() => setIsOpen(false)}>
                            ✕
                        </button>
                    </div>
                    <div className="promptbook-agent-content">
                        {agent ? (
                            <AgentChat agent={agent} />
                        ) : error ? (
                            <div className="promptbook-agent-error">Failed to connect to agent: {error.message}</div>
                        ) : (
                            <div className="promptbook-agent-loading">
                                {/* TODO: Skeleton loader */}
                                Connecting to agent...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * TODO: !!! Load the full branding
 * TODO: !!! <promptbook-agent> element
 */
