'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ToolCall } from '../../../types/ToolCall';
import { getToolCallIdentity } from '../../../utils/toolCalls/getToolCallIdentity';
import type { ChatMessage } from '../types/ChatMessage';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import { resolveToolCallFromChatMessages } from '../utils/resolveToolCallFromChatMessages';

/**
 * Stable selection state used by the tool-call details modal.
 *
 * @private function of `useChatToolCallState`
 */
type SelectedToolCallState = {
    readonly identity: string;
    readonly fallbackToolCall: ToolCall;
};

/**
 * Inputs required to keep Chat tool-call and citation modals in sync.
 *
 * @private function of `useChatToolCallState`
 */
type UseChatToolCallStateProps = {
    messages: ReadonlyArray<ChatMessage>;
};

/**
 * State and callbacks exposed back to `<Chat/>`.
 *
 * @private function of `useChatToolCallState`
 */
type UseChatToolCallStateResult = {
    readonly citationModalOpen: boolean;
    readonly closeCitationModal: () => void;
    readonly closeToolCallModal: () => void;
    readonly openCitation: (citation: ParsedCitation) => void;
    readonly openToolCall: (toolCall: ToolCall) => void;
    readonly selectedCitation: ParsedCitation | null;
    readonly selectedMessageAvailableTools: ChatMessage['availableTools'];
    readonly selectedToolCall: ToolCall | null;
    readonly selectedToolCallIdentity: string | null;
    readonly toolCallModalOpen: boolean;
};

/**
 * Collects every tool call snapshot attached to one rendered message.
 *
 * @private function of `useChatToolCallState`
 */
function getMessageToolCalls(message: ChatMessage): Array<ToolCall> {
    return [...(message.toolCalls || []), ...(message.completedToolCalls || []), ...(message.ongoingToolCalls || [])];
}

/**
 * Resolves the available-tools snapshot that corresponds to one selected tool call identity.
 *
 * @private function of `useChatToolCallState`
 */
function resolveSelectedMessageAvailableTools(
    messages: ReadonlyArray<ChatMessage>,
    selectedToolCallIdentity: string | null,
): ChatMessage['availableTools'] {
    if (!selectedToolCallIdentity) {
        return undefined;
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index]!;
        const hasMatchingToolCall = getMessageToolCalls(message).some(
            (candidateToolCall) => getToolCallIdentity(candidateToolCall) === selectedToolCallIdentity,
        );

        if (hasMatchingToolCall) {
            return message.prompt?.availableTools || message.availableTools;
        }
    }

    return undefined;
}

/**
 * Keeps Chat modal state focused on one selected tool call or citation.
 *
 * @private function of `<Chat/>`
 */
export function useChatToolCallState({ messages }: UseChatToolCallStateProps): UseChatToolCallStateResult {
    const [toolCallModalOpen, setToolCallModalOpen] = useState(false);
    const [selectedToolCallState, setSelectedToolCallState] = useState<SelectedToolCallState | null>(null);
    const [citationModalOpen, setCitationModalOpen] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<ParsedCitation | null>(null);

    const selectedToolCallIdentity = selectedToolCallState?.identity || null;
    const selectedToolCall = useMemo(
        () =>
            resolveToolCallFromChatMessages(
                messages,
                selectedToolCallIdentity,
                selectedToolCallState?.fallbackToolCall || null,
            ),
        [messages, selectedToolCallIdentity, selectedToolCallState],
    );
    const selectedMessageAvailableTools = useMemo(
        () => resolveSelectedMessageAvailableTools(messages, selectedToolCallIdentity),
        [messages, selectedToolCallIdentity],
    );

    const openToolCall = useCallback((toolCall: ToolCall) => {
        setSelectedToolCallState({
            identity: getToolCallIdentity(toolCall),
            fallbackToolCall: toolCall,
        });
        setToolCallModalOpen(true);
    }, []);

    const closeToolCallModal = useCallback(() => {
        setToolCallModalOpen(false);
        setSelectedToolCallState(null);
    }, []);

    const openCitation = useCallback((citation: ParsedCitation) => {
        setSelectedCitation(citation);
        setCitationModalOpen(true);
    }, []);

    const closeCitationModal = useCallback(() => {
        setCitationModalOpen(false);
    }, []);

    return {
        citationModalOpen,
        closeCitationModal,
        closeToolCallModal,
        openCitation,
        openToolCall,
        selectedCitation,
        selectedMessageAvailableTools,
        selectedToolCall,
        selectedToolCallIdentity,
        toolCallModalOpen,
    };
}
