'use client';

import { useEffect, useId, useState } from 'react';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { classNames } from '../_common/react-utils/classNames';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import { CloseIcon } from '../icons/CloseIcon';
import { PromptbookAgentIntegrationProps } from './PromptbookAgentIntegration';
import styles from './PromptbookAgentSeamlessIntegration.module.css';

/**
 * @private props of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationProps = Omit<PromptbookAgentIntegrationProps, 'formfactor'> & {
    /**
     * Use iframe instead of implementing the chat directly
     *
     * When `true`, the chat will be rendered in an iframe pointing to the agent's chat endpoint.
     * When `false`, the chat will be rendered directly using React components.
     *
     * @default false
     */
    readonly isIframeUsed?: boolean;
};

/**
 * Renders a floating agent button that opens a chat window with the remote agent.
 *
 * @private component of PromptbookAgentIntegration
 */
export function PromptbookAgentSeamlessIntegration(props: PromptbookAgentSeamlessIntegrationProps) {
    const { agentUrl, meta, onOpenChange, className, style, isFocusedOnLoad, isIframeUsed = false } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const windowId = useId();

    useEffect(() => {
        if (onOpenChange) {
            onOpenChange(isOpen);
        }
        if (!isOpen) {
            setIsIframeLoaded(false);
        }
    }, [isOpen, onOpenChange]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

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
        // Note: [🤹] Using default avatar from the agent server
        `${agentUrl}/images/default-avatar.png`;
    const color = agent?.meta?.color || meta?.color;
    const displayName = agent?.meta.fullname || meta?.fullname || agent?.agentName || 'Chat with Agent';

    let connectionStatus: 'connected' | 'pending' | 'error' = 'pending';
    if (agent) {
        connectionStatus = 'connected';
    } else if (error) {
        connectionStatus = 'error';
    }
    const connectionStatusText =
        connectionStatus === 'connected' ? 'Online' : connectionStatus === 'error' ? 'Connection issue' : 'Connecting';

    return (
        <div
            className={classNames(
                `${styles.PromptbookAgentSeamlessIntegration} ${isOpen ? styles.open : styles.closed}`,
                className,
            )}
            style={style}
        >
            <button
                type="button"
                className={styles.PromptbookAgentSeamlessIntegrationButton}
                onClick={() => setIsOpen(!isOpen)}
                style={{ backgroundColor: color }}
                aria-expanded={isOpen}
                aria-controls={windowId}
                title={isOpen ? `Close chat with ${displayName}` : `Open chat with ${displayName}`}
            >
                <div className={styles.PromptbookAgentSeamlessIntegrationAvatar}>
                    <img src={image} alt={`${displayName} avatar`} />
                </div>
                <div
                    className={classNames(
                        styles.PromptbookAgentSeamlessIntegrationStatus,
                        connectionStatus === 'connected'
                            ? styles.PromptbookAgentSeamlessIntegrationStatusConnected
                            : connectionStatus === 'error'
                              ? styles.PromptbookAgentSeamlessIntegrationStatusError
                              : styles.PromptbookAgentSeamlessIntegrationStatusPending,
                    )}
                />
                <div className={styles.PromptbookAgentSeamlessIntegrationText}>
                    <div className={styles.PromptbookAgentSeamlessIntegrationLabel}>Chat</div>
                    <div className={styles.PromptbookAgentSeamlessIntegrationHint}>{displayName}</div>
                </div>
                <span className={styles.PromptbookAgentSeamlessIntegrationScreenReaderOnly}>{connectionStatusText}</span>
            </button>

            {isOpen && (
                <div className={styles.PromptbookAgentSeamlessIntegrationWindow} id={windowId}>
                    <div
                        className={styles.PromptbookAgentSeamlessIntegrationHeader}
                        style={{ backgroundColor: color }}
                        ref={setHeaderElement}
                    >
                        <div className={styles.PromptbookAgentSeamlessIntegrationTitleWrap}>
                            <div className={styles.PromptbookAgentSeamlessIntegrationTitle}>{displayName}</div>
                            <div className={styles.PromptbookAgentSeamlessIntegrationSubtitle}>{connectionStatusText}</div>
                        </div>
                        {isIframeUsed && (
                            <button
                                className={styles.PromptbookAgentSeamlessIntegrationClose}
                                onClick={() => setIsOpen(false)}
                                title="Close"
                                aria-label="Close chat"
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </div>
                    <div className={styles.PromptbookAgentSeamlessIntegrationContent}>
                        {isIframeUsed ? (
                            <>
                                {!isIframeLoaded && (
                                    <div className={styles.PromptbookAgentSeamlessIntegrationLoading}>
                                        <div className={styles.PromptbookAgentSeamlessIntegrationLoadingSpinner} />
                                        <div className={styles.PromptbookAgentSeamlessIntegrationLoadingText}>
                                            Preparing chat...
                                        </div>
                                    </div>
                                )}
                                <iframe
                                    src={agentUrl + '/chat?headless'}
                                    className={styles.PromptbookAgentSeamlessIntegrationIframe}
                                    style={{ opacity: isIframeLoaded ? 1 : 0 }}
                                    tabIndex={-1}
                                    onLoad={() => setIsIframeLoaded(true)}
                                />
                            </>
                        ) : agent ? (
                            <AgentChat
                                agent={agent}
                                actionsContainer={headerElement}
                                isFocusedOnLoad={isFocusedOnLoad}
                                extraActions={
                                    <button
                                        className={styles.PromptbookAgentSeamlessIntegrationClose}
                                        onClick={() => setIsOpen(false)}
                                        title="Close"
                                        aria-label="Close chat"
                                    >
                                        <CloseIcon />
                                    </button>
                                }
                                visual="STANDALONE"
                            />
                        ) : error ? (
                            <div className={styles.PromptbookAgentSeamlessIntegrationError}>
                                <div className={styles.PromptbookAgentSeamlessIntegrationErrorTitle}>
                                    Failed to connect to the agent
                                </div>
                                <div className={styles.PromptbookAgentSeamlessIntegrationErrorMessage}>{error.message}</div>
                            </div>
                        ) : (
                            <div className={styles.PromptbookAgentSeamlessIntegrationLoading}>
                                <div className={styles.PromptbookAgentSeamlessIntegrationLoadingSpinner} />
                                <div className={styles.PromptbookAgentSeamlessIntegrationLoadingText}>
                                    Connecting to agent...
                                </div>
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
