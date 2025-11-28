'use client';

import { useEffect, useState } from 'react';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import styles from './PromptbookAgent.module.css';

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
        <div className={`${styles.promptbookAgent} ${isOpen ? styles.open : styles.closed}`}>
            <div className={styles.promptbookAgentButton} onClick={() => setIsOpen(!isOpen)}>
                <div className={styles.promptbookAgentAvatar}>
                    {/* TODO: Use agent avatar if available */}
                    <img
                        src={
                            agent?.meta?.image ||
                            'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
                        }
                        alt="Agent"
                    />
                </div>
                <div className={styles.promptbookAgentLabel}>CHAT</div>
            </div>

            {isOpen && (
                <div className={styles.promptbookAgentWindow}>
                    <div className={styles.promptbookAgentHeader}>
                        <div className={styles.promptbookAgentTitle}>{agent?.agentName || 'Chat with Agent'}</div>
                        <button className={styles.promptbookAgentClose} onClick={() => setIsOpen(false)}>
                            ✕
                        </button>
                    </div>
                    <div className={styles.promptbookAgentContent}>
                        {agent ? (
                            <AgentChat agent={agent} />
                        ) : error ? (
                            <div className={styles.promptbookAgentError}>
                                Failed to connect to agent: {error.message}
                            </div>
                        ) : (
                            <div className={styles.promptbookAgentLoading}>
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
