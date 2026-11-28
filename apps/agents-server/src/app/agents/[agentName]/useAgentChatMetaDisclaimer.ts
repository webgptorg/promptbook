import { type ChatMessage } from '@promptbook-local/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    acceptMetaDisclaimer,
    fetchMetaDisclaimerStatus,
    type MetaDisclaimerStatus,
} from '../../../utils/metaDisclaimerClient';

/**
 * Input options consumed by `useAgentChatMetaDisclaimer`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatMetaDisclaimerProps = {
    /**
     * Agent identifier used by disclaimer endpoints.
     */
    readonly agentName: string;
    /**
     * Optional auto-executed message.
     */
    readonly autoExecuteMessage?: string;
    /**
     * Optional auto-executed message attachments.
     */
    readonly autoExecuteMessageAttachments?: ChatMessage['attachments'];
    /**
     * Called once when the effective auto-execute payload becomes eligible for dispatch.
     */
    readonly onAutoExecuteMessageConsumed?: () => void;
};

/**
 * Hook output exposed to `AgentChatWrapper`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatMetaDisclaimerResult = {
    /**
     * Whether disclaimer acceptance request is in-flight.
     */
    readonly isMetaDisclaimerAccepting: boolean;
    /**
     * Current disclaimer error message.
     */
    readonly metaDisclaimerError: string | null;
    /**
     * Disclaimer markdown shown in the dialog.
     */
    readonly metaDisclaimerMarkdown: string | null;
    /**
     * Whether disclaimer dialog should be rendered.
     */
    readonly shouldRenderMetaDisclaimerDialog: boolean;
    /**
     * Auto-execute message gated by disclaimer status.
     */
    readonly effectiveAutoExecuteMessage: string | undefined;
    /**
     * Auto-execute attachments gated by disclaimer status.
     */
    readonly effectiveAutoExecuteMessageAttachments: ChatMessage['attachments'] | undefined;
    /**
     * Reloads disclaimer status.
     */
    readonly loadMetaDisclaimerStatus: () => Promise<void>;
    /**
     * Accepts disclaimer for the current user and agent.
     */
    readonly handleAcceptMetaDisclaimer: () => Promise<void>;
};

/**
 * Serializes auto-execute payload for change detection.
 *
 * @private function of AgentChatWrapper
 */
function serializeAutoExecutePayload(message?: string, attachments?: ChatMessage['attachments']): string {
    const normalizedMessage = message ?? '';
    if (!attachments || attachments.length === 0) {
        return normalizedMessage;
    }

    try {
        return `${normalizedMessage}|${JSON.stringify(attachments)}`;
    } catch {
        return normalizedMessage;
    }
}

/**
 * Manages META DISCLAIMER status and auto-execute gating for the agent chat.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatMetaDisclaimer({
    agentName,
    autoExecuteMessage,
    autoExecuteMessageAttachments,
    onAutoExecuteMessageConsumed,
}: UseAgentChatMetaDisclaimerProps): UseAgentChatMetaDisclaimerResult {
    const [metaDisclaimerStatus, setMetaDisclaimerStatus] = useState<MetaDisclaimerStatus | null>(null);
    const [isMetaDisclaimerLoading, setIsMetaDisclaimerLoading] = useState(true);
    const [isMetaDisclaimerAccepting, setIsMetaDisclaimerAccepting] = useState(false);
    const [metaDisclaimerError, setMetaDisclaimerError] = useState<string | null>(null);
    const hasReportedAutoExecuteMessageRef = useRef(false);
    const lastAutoExecutePayloadRef = useRef<string | undefined>(
        serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments),
    );

    /**
     * Loads disclaimer status for the current user and agent.
     *
     * @private function of AgentChatWrapper
     */
    const loadMetaDisclaimerStatus = useCallback(async () => {
        setIsMetaDisclaimerLoading(true);
        setMetaDisclaimerError(null);

        try {
            const status = await fetchMetaDisclaimerStatus(agentName);
            setMetaDisclaimerStatus(status);
        } catch (error) {
            setMetaDisclaimerError(error instanceof Error ? error.message : 'Failed to load disclaimer.');
        } finally {
            setIsMetaDisclaimerLoading(false);
        }
    }, [agentName]);

    useEffect(() => {
        void loadMetaDisclaimerStatus();
    }, [loadMetaDisclaimerStatus]);

    /**
     * Persists disclaimer agreement for the current user and agent.
     *
     * @private function of AgentChatWrapper
     */
    const handleAcceptMetaDisclaimer = useCallback(async () => {
        setIsMetaDisclaimerAccepting(true);
        setMetaDisclaimerError(null);

        try {
            const acceptedStatus = await acceptMetaDisclaimer(agentName);
            setMetaDisclaimerStatus(acceptedStatus);
        } catch (error) {
            setMetaDisclaimerError(error instanceof Error ? error.message : 'Failed to accept disclaimer.');
        } finally {
            setIsMetaDisclaimerAccepting(false);
        }
    }, [agentName]);

    const isMetaDisclaimerEnabled = metaDisclaimerStatus?.enabled === true;
    const hasAcceptedMetaDisclaimer = isMetaDisclaimerEnabled ? metaDisclaimerStatus?.accepted === true : true;
    const isMetaDisclaimerBlockingChat =
        isMetaDisclaimerLoading ||
        metaDisclaimerError !== null ||
        (isMetaDisclaimerEnabled && !hasAcceptedMetaDisclaimer);
    const shouldRenderMetaDisclaimerDialog =
        metaDisclaimerError !== null || (isMetaDisclaimerEnabled && !hasAcceptedMetaDisclaimer);
    const metaDisclaimerMarkdown = metaDisclaimerStatus?.markdown || null;
    const effectiveAutoExecuteMessage = isMetaDisclaimerBlockingChat ? undefined : autoExecuteMessage;
    const effectiveAutoExecuteMessageAttachments = isMetaDisclaimerBlockingChat ? undefined : autoExecuteMessageAttachments;
    const hasEffectiveAutoExecuteContent =
        Boolean(effectiveAutoExecuteMessage) || Boolean(effectiveAutoExecuteMessageAttachments?.length);

    useEffect(() => {
        const payload = serializeAutoExecutePayload(autoExecuteMessage, autoExecuteMessageAttachments);
        if (lastAutoExecutePayloadRef.current === payload) {
            return;
        }

        lastAutoExecutePayloadRef.current = payload;
        hasReportedAutoExecuteMessageRef.current = false;
    }, [autoExecuteMessage, autoExecuteMessageAttachments]);

    useEffect(() => {
        if (!hasEffectiveAutoExecuteContent) {
            return;
        }

        if (hasReportedAutoExecuteMessageRef.current) {
            return;
        }

        hasReportedAutoExecuteMessageRef.current = true;
        onAutoExecuteMessageConsumed?.();
    }, [hasEffectiveAutoExecuteContent, onAutoExecuteMessageConsumed]);

    return {
        isMetaDisclaimerAccepting,
        metaDisclaimerError,
        metaDisclaimerMarkdown,
        shouldRenderMetaDisclaimerDialog,
        effectiveAutoExecuteMessage,
        effectiveAutoExecuteMessageAttachments,
        loadMetaDisclaimerStatus,
        handleAcceptMetaDisclaimer,
    };
}

