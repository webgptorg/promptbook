'use client';

import { useEffect, useState } from 'react';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { classNames } from '../_common/react-utils/classNames';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import { CloseIcon } from '../icons/CloseIcon';
import { PromptbookAgentProps } from './PromptbookAgent';
import styles from './PromptbookAgentSeamless.module.css';

type PromptbookAgentSeamlessProps = Omit<PromptbookAgentProps, 'formfactor'>;

/**
 * Renders a floating agent button that opens a chat window with the remote agent.
 *
 * @public exported from `@promptbook/components`
 */
export function PromptbookAgentSeamless(props: PromptbookAgentSeamlessProps) {
    const { agentUrl, meta, onOpenChange, className, style } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
    }, [isOpen, onOpenChange]);
    const [agent, setAgent] = useState<RemoteAgent | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (agent && meta) {
            if (agent.meta.image && meta.image && agent.meta.image !== meta.image) {
                console.warn('Conflict in agent meta image:', { server: agent.meta.image, props: meta.image });
            }
            if (agent.meta.color && meta.color && agent.meta.color !== meta.color) {
                console.warn('Conflict in agent meta color:', { server: agent.meta.color, props: meta.color });
            }
        }
    }, [agent, meta]);

    useEffect(() => {
        let isMounted = true;
        setAgent(null);
        setError(null);

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

    const image =
        agent?.meta?.image ||
        meta?.image ||
        'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    const color = agent?.meta?.color || meta?.color;

    let connectionStatus: 'connected' | 'pending' | 'error' = 'pending';
    if (agent) {
        connectionStatus = 'connected';
    } else if (error) {
        connectionStatus = 'error';
    }

    return (
        <div
            className={classNames(
                `${styles.PromptbookAgentSeamless} ${isOpen ? styles.open : styles.closed}`,
                className,
            )}
            style={style}
        >
            <div
                className={styles.PromptbookAgentSeamlessButton}
                onClick={() => setIsOpen(!isOpen)}
                style={{ backgroundColor: color }}
            >
                <div className={styles.PromptbookAgentSeamlessAvatar}>
                    {/* TODO: Use agent avatar if available */}
                    <img src={image} alt="Agent" />
                </div>
                <div
                    className={`${styles.PromptbookAgentSeamlessStatus} ${
                        connectionStatus === 'connected'
                            ? styles.PromptbookAgentSeamlessStatusConnected
                            : connectionStatus === 'error'
                            ? styles.PromptbookAgentSeamlessStatusError
                            : styles.PromptbookAgentSeamlessStatusPending
                    }`}
                />
                <div className={styles.PromptbookAgentSeamlessLabel}>CHAT</div>
            </div>

            {isOpen && (
                <div className={styles.PromptbookAgentSeamlessWindow}>
                    <div
                        className={styles.PromptbookAgentSeamlessHeader}
                        style={{ backgroundColor: color }}
                        ref={setHeaderElement}
                    >
                        <div className={styles.PromptbookAgentSeamlessTitle}>
                            {agent?.meta.fullname || meta?.fullname || agent?.agentName || 'Chat with Agent'}
                        </div>
                    </div>
                    <div className={styles.PromptbookAgentSeamlessContent}>
                        {agent ? (
                            <AgentChat
                                agent={agent}
                                actionsContainer={headerElement}
                                extraActions={
                                    <button
                                        className={styles.PromptbookAgentSeamlessClose}
                                        onClick={() => setIsOpen(false)}
                                        title="Close"
                                    >
                                        <CloseIcon />
                                    </button>
                                }
                            />
                        ) : error ? (
                            <div className={styles.PromptbookAgentSeamlessError}>
                                Failed to connect to agent: {error.message}
                            </div>
                        ) : (
                            <div className={styles.PromptbookAgentSeamlessLoading}>
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
 * TODO: !!!! Use iframe here instead of implementing the chat directly, allow to switch between seamless and iframe mode via `isIframeUsed` prop
 * TODO: !!! Load the full branding
 * TODO: !!! <promptbook-agent> element
 */
