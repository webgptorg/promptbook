'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RemoteAgent } from '../../llm-providers/agent/RemoteAgent';
import { AgentChat } from '../Chat/AgentChat/AgentChat';
import { CloseIcon } from '../icons/CloseIcon';
import { classNames } from '../_common/react-utils/classNames';
import type { PromptbookAgentIntegrationProps } from './PromptbookAgentIntegration';
import styles from './PromptbookAgentSeamlessIntegration.module.css';

/**
 * Props of PromptbookAgentSeamlessIntegration.
 *
 * @private
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
 * Connection status of the seamless integration widget.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationConnectionStatus = 'connected' | 'pending' | 'error';

/**
 * Resolved branding data used by the seamless integration UI.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationDisplayInfo = {
    readonly image: string;
    readonly color?: string;
    readonly displayName: string;
};

/**
 * Connection presentation values used by the widget UI.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationConnectionPresentation = {
    readonly connectionStatus: PromptbookAgentSeamlessIntegrationConnectionStatus;
    readonly connectionStatusText: string;
    readonly connectionStatusClassName: string;
};

/**
 * Parameters for managing controlled/uncontrolled open state.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type UsePromptbookAgentSeamlessIntegrationOpenStateProps = Pick<
    PromptbookAgentSeamlessIntegrationProps,
    'agentUrl' | 'defaultOpen' | 'isOpen' | 'onOpenChange'
>;

/**
 * Parameters for closing the widget on outside interaction.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type UseClosePromptbookAgentSeamlessIntegrationOnOutsideInteractionProps = {
    readonly isOpen: boolean;
    readonly rootElementRef: {
        readonly current: HTMLDivElement | null;
    };
    readonly onClose: () => void;
};

/**
 * Parameters for resolving the displayed branding.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type ResolvePromptbookAgentSeamlessIntegrationDisplayInfoProps = Pick<
    PromptbookAgentSeamlessIntegrationProps,
    'agentUrl' | 'meta'
> & {
    readonly agent: RemoteAgent | null;
};

/**
 * Parameters for resolving connection badge and text.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type CreatePromptbookAgentSeamlessIntegrationConnectionPresentationProps = {
    readonly isConnected: boolean;
    readonly error: Error | null;
    readonly isIframeUsed: boolean;
};

/**
 * Props for the shared close button.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationCloseButtonProps = {
    readonly onClose: () => void;
};

/**
 * Props for the loading state.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationLoadingStateProps = {
    readonly displayName: string;
};

/**
 * Props for the error state.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationErrorStateProps = {
    readonly error: Error;
};

/**
 * Props for rendering the chat content area.
 *
 * @private internal type of PromptbookAgentSeamlessIntegration
 */
type PromptbookAgentSeamlessIntegrationContentProps = {
    readonly agent: RemoteAgent | null;
    readonly agentUrl: string;
    readonly displayName: string;
    readonly error: Error | null;
    readonly headerElement: HTMLDivElement | null;
    readonly isFocusedOnLoad?: boolean;
    readonly isIframeLoaded: boolean;
    readonly isIframeUsed: boolean;
    readonly onClose: () => void;
    readonly onIframeLoad: () => void;
};

/**
 * Handles controlled/uncontrolled open state for the widget.
 *
 * @private internal hook of PromptbookAgentSeamlessIntegration
 */
function usePromptbookAgentSeamlessIntegrationOpenState({
    agentUrl,
    defaultOpen = false,
    isOpen: controlledIsOpen,
    onOpenChange,
}: UsePromptbookAgentSeamlessIntegrationOpenStateProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
    const isOpen = controlledIsOpen ?? internalIsOpen;

    const setOpen = useCallback(
        (nextIsOpen: boolean) => {
            if (controlledIsOpen === undefined) {
                setInternalIsOpen(nextIsOpen);
            }
            onOpenChange?.(nextIsOpen);
        },
        [controlledIsOpen, onOpenChange],
    );

    useEffect(() => {
        if (controlledIsOpen !== undefined) {
            return;
        }

        setInternalIsOpen(defaultOpen);
    }, [agentUrl, controlledIsOpen, defaultOpen]);

    return { isOpen, setOpen };
}

/**
 * Closes the widget when the user presses Escape or clicks outside.
 *
 * @private internal hook of PromptbookAgentSeamlessIntegration
 */
function useClosePromptbookAgentSeamlessIntegrationOnOutsideInteraction({
    isOpen,
    rootElementRef,
    onClose,
}: UseClosePromptbookAgentSeamlessIntegrationOnOutsideInteractionProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handlePointerDown = (event: PointerEvent) => {
            const rootElement = rootElementRef.current;
            if (!rootElement) {
                return;
            }

            const target = event.target;
            if (target instanceof Node && rootElement.contains(target)) {
                return;
            }

            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [isOpen, onClose, rootElementRef]);
}

/**
 * Connects to the remote agent and tracks the connection lifecycle.
 *
 * @private internal hook of PromptbookAgentSeamlessIntegration
 */
function useRemotePromptbookAgent(agentUrl: string) {
    const [agent, setAgent] = useState<RemoteAgent | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isAgentConnected, setIsAgentConnected] = useState(false);

    useEffect(() => {
        let isMounted = true;

        setAgent(null);
        setError(null);
        setIsAgentConnected(false);

        const connectToAgent = async () => {
            try {
                // TODO: [🧠] Maybe we should not connect immediately but only when the user clicks the button or hovers?
                //            But for now, to have a fast response when clicking, we connect immediately.
                const connectedAgent = await RemoteAgent.connect({ agentUrl });
                if (isMounted) {
                    setAgent(connectedAgent);
                    setIsAgentConnected(true);
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

    return { agent, error, isAgentConnected };
}

/**
 * Warns when props branding conflicts with the branding returned by the server.
 *
 * @private internal hook of PromptbookAgentSeamlessIntegration
 */
function useWarnAboutPromptbookAgentMetaConflicts(
    agent: RemoteAgent | null,
    meta: PromptbookAgentSeamlessIntegrationProps['meta'],
) {
    useEffect(() => {
        if (!agent || !meta) {
            return;
        }

        if (agent.meta.image && meta.image && agent.meta.image !== meta.image) {
            console.warn('Conflict in agent meta image:', { server: agent.meta.image, props: meta.image });
        }
        if (agent.meta.color && meta.color && agent.meta.color !== meta.color) {
            console.warn('Conflict in agent meta color:', { server: agent.meta.color, props: meta.color });
        }
    }, [agent, meta]);
}

/**
 * Resolves the avatar, color, and display name shown by the widget.
 *
 * @private internal utility of PromptbookAgentSeamlessIntegration
 */
function resolvePromptbookAgentSeamlessIntegrationDisplayInfo({
    agent,
    agentUrl,
    meta,
}: ResolvePromptbookAgentSeamlessIntegrationDisplayInfoProps): PromptbookAgentSeamlessIntegrationDisplayInfo {
    return {
        image:
            agent?.meta?.image ||
            meta?.image ||
            // Note: [🤹] Using default avatar from the agent server
            `${agentUrl}/images/default-avatar.png`,
        color: agent?.meta?.color || meta?.color,
        displayName: agent?.meta.fullname || meta?.fullname || agent?.agentName || 'Chat with Agent',
    };
}

/**
 * Resolves the connection status label and indicator class.
 *
 * @private internal utility of PromptbookAgentSeamlessIntegration
 */
function createPromptbookAgentSeamlessIntegrationConnectionPresentation({
    isConnected,
    error,
    isIframeUsed,
}: CreatePromptbookAgentSeamlessIntegrationConnectionPresentationProps): PromptbookAgentSeamlessIntegrationConnectionPresentation {
    let connectionStatus: PromptbookAgentSeamlessIntegrationConnectionStatus = 'pending';

    if (isConnected) {
        connectionStatus = 'connected';
    } else if (error && !isIframeUsed) {
        connectionStatus = 'error';
    }

    return {
        connectionStatus,
        connectionStatusText:
            connectionStatus === 'connected'
                ? 'Online'
                : connectionStatus === 'error'
                ? 'Connection issue'
                : 'Connecting',
        connectionStatusClassName: getPromptbookAgentSeamlessIntegrationStatusClassName(connectionStatus),
    };
}

/**
 * Resolves the CSS class for the connection status indicator.
 *
 * @private internal utility of PromptbookAgentSeamlessIntegration
 */
function getPromptbookAgentSeamlessIntegrationStatusClassName(
    connectionStatus: PromptbookAgentSeamlessIntegrationConnectionStatus,
) {
    if (connectionStatus === 'connected') {
        return styles.PromptbookAgentSeamlessIntegrationStatusConnected;
    }

    if (connectionStatus === 'error') {
        return styles.PromptbookAgentSeamlessIntegrationStatusError;
    }

    return styles.PromptbookAgentSeamlessIntegrationStatusPending;
}

/**
 * Renders the shared close button used by the widget.
 *
 * @private internal subcomponent of PromptbookAgentSeamlessIntegration
 */
function PromptbookAgentSeamlessIntegrationCloseButton({
    onClose,
}: PromptbookAgentSeamlessIntegrationCloseButtonProps) {
    return (
        <button
            className={styles.PromptbookAgentSeamlessIntegrationClose}
            onClick={onClose}
            title="Close"
            aria-label="Close chat"
        >
            <CloseIcon />
        </button>
    );
}

/**
 * Renders the loading state shared by iframe and embedded chat modes.
 *
 * @private internal subcomponent of PromptbookAgentSeamlessIntegration
 */
function PromptbookAgentSeamlessIntegrationLoadingState({
    displayName,
}: PromptbookAgentSeamlessIntegrationLoadingStateProps) {
    return (
        <div className={styles.PromptbookAgentSeamlessIntegrationLoading}>
            <div className={styles.PromptbookAgentSeamlessIntegrationLoadingShimmer} />
            <div className={styles.PromptbookAgentSeamlessIntegrationLoadingSpinner} />
            <div className={styles.PromptbookAgentSeamlessIntegrationLoadingTitle}>Preparing your chat</div>
            <div className={styles.PromptbookAgentSeamlessIntegrationLoadingText}>Connecting to {displayName}...</div>
        </div>
    );
}

/**
 * Renders the inline error state for direct chat mode.
 *
 * @private internal subcomponent of PromptbookAgentSeamlessIntegration
 */
function PromptbookAgentSeamlessIntegrationErrorState({ error }: PromptbookAgentSeamlessIntegrationErrorStateProps) {
    return (
        <div className={styles.PromptbookAgentSeamlessIntegrationError}>
            <div className={styles.PromptbookAgentSeamlessIntegrationErrorTitle}>Failed to connect to the agent</div>
            <div className={styles.PromptbookAgentSeamlessIntegrationErrorMessage}>{error.message}</div>
        </div>
    );
}

/**
 * Renders the main content area based on the selected integration mode.
 *
 * @private internal subcomponent of PromptbookAgentSeamlessIntegration
 */
function PromptbookAgentSeamlessIntegrationContent({
    agent,
    agentUrl,
    displayName,
    error,
    headerElement,
    isFocusedOnLoad,
    isIframeLoaded,
    isIframeUsed,
    onClose,
    onIframeLoad,
}: PromptbookAgentSeamlessIntegrationContentProps) {
    if (isIframeUsed) {
        return (
            <>
                {!isIframeLoaded && <PromptbookAgentSeamlessIntegrationLoadingState displayName={displayName} />}
                <iframe
                    src={agentUrl + '/chat?headless'}
                    className={styles.PromptbookAgentSeamlessIntegrationIframe}
                    style={{ opacity: isIframeLoaded ? 1 : 0 }}
                    tabIndex={-1}
                    onLoad={onIframeLoad}
                />
            </>
        );
    }

    if (agent) {
        return (
            <AgentChat
                agent={agent}
                actionsContainer={headerElement}
                isFocusedOnLoad={isFocusedOnLoad}
                extraActions={<PromptbookAgentSeamlessIntegrationCloseButton onClose={onClose} />}
                layout="STANDALONE"
            />
        );
    }

    if (error) {
        return <PromptbookAgentSeamlessIntegrationErrorState error={error} />;
    }

    return <PromptbookAgentSeamlessIntegrationLoadingState displayName={displayName} />;
}

/**
 * Renders a floating agent button that opens a chat window with the remote agent.
 *
 * @private component of PromptbookAgentIntegration
 */
export function PromptbookAgentSeamlessIntegration(props: PromptbookAgentSeamlessIntegrationProps) {
    const { agentUrl, meta, className, style, isFocusedOnLoad, isIframeUsed = false } = props;
    const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const rootElementRef = useRef<HTMLDivElement | null>(null);
    const windowId = useId();
    const { isOpen, setOpen } = usePromptbookAgentSeamlessIntegrationOpenState(props);
    const { agent, error, isAgentConnected } = useRemotePromptbookAgent(agentUrl);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, [setOpen]);

    const handleToggle = useCallback(() => {
        setOpen(!isOpen);
    }, [isOpen, setOpen]);

    const handleIframeLoad = useCallback(() => {
        setIsIframeLoaded(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setIsIframeLoaded(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setIsIframeLoaded(false);
    }, [agentUrl]);

    useClosePromptbookAgentSeamlessIntegrationOnOutsideInteraction({
        isOpen,
        rootElementRef,
        onClose: handleClose,
    });

    useWarnAboutPromptbookAgentMetaConflicts(agent, meta);

    // TODO: [🧠] Handle loading state better (show spinner or skeleton in the chat window)
    // TODO: [🧠] Handle error state (show error message in the chat window)

    const { image, color, displayName } = resolvePromptbookAgentSeamlessIntegrationDisplayInfo({
        agent,
        agentUrl,
        meta,
    });
    const { connectionStatusText, connectionStatusClassName } =
        createPromptbookAgentSeamlessIntegrationConnectionPresentation({
            isConnected: isAgentConnected || isIframeLoaded,
            error,
            isIframeUsed,
        });

    return (
        <div
            className={classNames(
                `${styles.PromptbookAgentSeamlessIntegration} ${isOpen ? styles.open : styles.closed}`,
                className,
            )}
            style={style}
            ref={rootElementRef}
        >
            <button
                type="button"
                className={styles.PromptbookAgentSeamlessIntegrationButton}
                onClick={handleToggle}
                style={{ backgroundColor: color }}
                aria-expanded={isOpen}
                aria-controls={windowId}
                title={isOpen ? `Close chat with ${displayName}` : `Open chat with ${displayName}`}
            >
                <div className={styles.PromptbookAgentSeamlessIntegrationAvatar}>
                    <img src={image} alt={`${displayName} avatar`} />
                </div>
                <div
                    className={classNames(styles.PromptbookAgentSeamlessIntegrationStatus, connectionStatusClassName)}
                />
                <div className={styles.PromptbookAgentSeamlessIntegrationText}>
                    <div className={styles.PromptbookAgentSeamlessIntegrationLabel}>Chat</div>
                    <div className={styles.PromptbookAgentSeamlessIntegrationHint}>{displayName}</div>
                </div>
                <span className={styles.PromptbookAgentSeamlessIntegrationScreenReaderOnly}>
                    {connectionStatusText}
                </span>
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
                            <div className={styles.PromptbookAgentSeamlessIntegrationSubtitle}>
                                {connectionStatusText}
                            </div>
                        </div>
                        {isIframeUsed && <PromptbookAgentSeamlessIntegrationCloseButton onClose={handleClose} />}
                    </div>
                    <div className={styles.PromptbookAgentSeamlessIntegrationContent}>
                        <PromptbookAgentSeamlessIntegrationContent
                            agent={agent}
                            agentUrl={agentUrl}
                            displayName={displayName}
                            error={error}
                            headerElement={headerElement}
                            isFocusedOnLoad={isFocusedOnLoad}
                            isIframeLoaded={isIframeLoaded}
                            isIframeUsed={isIframeUsed}
                            onClose={handleClose}
                            onIframeLoad={handleIframeLoad}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// TODO: !!! Load the full branding
// TODO: !!! <promptbook-agent> element
