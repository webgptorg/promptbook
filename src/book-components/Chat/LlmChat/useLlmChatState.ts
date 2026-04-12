'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentCapability } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { id } from '../../../types/typeAliases';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatPersistence } from '../utils/ChatPersistence';
import { createTeamToolNameFromUrl } from '../utils/createTeamToolNameFromUrl';
import { normalizeThinkingMessageVariants } from '../utils/thinkingMessageVariants';
import { DEFAULT_CHAT_FAIL_MESSAGE } from './defaults';
import type { LlmChatProps } from './LlmChatProps';
import { useLlmChatMessageHandler } from './useLlmChatMessageHandler';
import { useLlmChatMessages } from './useLlmChatMessages';

/**
 * Metadata for a teammate agent tool.
 *
 * @private function of `useLlmChatState`
 */
type TeammateMetadata = {
    readonly url: string;
    readonly label?: string;
    readonly instructions?: string;
    readonly toolName: string;
};

/**
 * Lookup map of teammate metadata by tool name.
 *
 * @private function of `useLlmChatState`
 */
type TeammatesMap = Record<string, TeammateMetadata>;

/**
 * Minimal task-progress item rendered by `<Chat/>`.
 *
 * @private function of `useLlmChatState`
 */
type LlmChatTaskProgress = {
    readonly id: string;
    readonly name: string;
    readonly progress?: number;
};

/**
 * Extended LLM tools shape that may expose teammate metadata.
 *
 * @private function of `useLlmChatState`
 */
type TeammateAwareLlmTools = LlmExecutionTools & {
    readonly capabilities?: Array<AgentCapability>;
    readonly getModelRequirements?: () => Promise<{
        readonly metadata?: {
            readonly teammates?: Array<TeammateMetadata>;
        };
    }>;
};

/**
 * Inputs required to resolve the default participant list.
 *
 * @private function of `useLlmChatState`
 */
type ResolveLlmChatParticipantsProps = {
    readonly llmParticipantName: id;
    readonly llmTools: LlmExecutionTools;
    readonly providedParticipants?: ReadonlyArray<ChatParticipant>;
    readonly userParticipantName: id;
};

/**
 * State returned by `useLlmChatState`.
 *
 * @private function of `useLlmChatState`
 */
type UseLlmChatStateResult = {
    readonly handleMessage: (messageContent: string, attachments?: ChatMessage['attachments']) => Promise<void>;
    readonly handleReset: () => Promise<void>;
    readonly handleStopStreaming: () => void;
    readonly isStreaming: boolean;
    readonly isVoiceCalling: boolean;
    readonly messages: Array<ChatMessage>;
    readonly participants: ReadonlyArray<ChatParticipant>;
    readonly tasksProgress: Array<LlmChatTaskProgress>;
    readonly teammates: TeammatesMap | undefined;
};

/**
 * Builds a teammates lookup map from resolved metadata entries.
 *
 * @private function of `useLlmChatState`
 */
function buildTeammatesMap(entries: ReadonlyArray<TeammateMetadata>): TeammatesMap | undefined {
    const teammatesMap: TeammatesMap = {};

    for (const teammate of entries) {
        if (teammate.toolName) {
            teammatesMap[teammate.toolName] = teammate;
        }
    }

    return Object.keys(teammatesMap).length > 0 ? teammatesMap : undefined;
}

/**
 * Builds teammate metadata from TEAM capabilities when richer metadata is unavailable.
 *
 * @private function of `useLlmChatState`
 */
function buildTeammatesMapFromCapabilities(capabilities: Array<AgentCapability> | undefined): TeammatesMap | undefined {
    if (!capabilities || capabilities.length === 0) {
        return undefined;
    }

    const teammateEntries: Array<TeammateMetadata> = [];

    for (const capability of capabilities) {
        if (capability.type !== 'team' || !capability.agentUrl) {
            continue;
        }

        teammateEntries.push({
            url: capability.agentUrl,
            label: capability.label,
            toolName: createTeamToolNameFromUrl(capability.agentUrl, capability.label),
        });
    }

    return buildTeammatesMap(teammateEntries);
}

/**
 * Converts prompt-parameter values into the string payload expected by prompt templates.
 *
 * @private function of `useLlmChatState`
 */
function normalizePromptParameters(parameters: Record<string, unknown>): Record<string, string> {
    const normalizedEntries: Array<[string, string]> = [];

    for (const [key, value] of Object.entries(parameters)) {
        if (value === undefined || value === null) {
            continue;
        }

        if (typeof value === 'string') {
            normalizedEntries.push([key, value]);
            continue;
        }

        normalizedEntries.push([key, JSON.stringify(value)]);
    }

    return Object.fromEntries(normalizedEntries);
}

/**
 * Resolves the participant list rendered by `<Chat/>`.
 *
 * @private function of `useLlmChatState`
 */
function resolveLlmChatParticipants(props: ResolveLlmChatParticipantsProps): ReadonlyArray<ChatParticipant> {
    const { llmParticipantName, llmTools, providedParticipants, userParticipantName } = props;

    if (providedParticipants) {
        return providedParticipants;
    }

    return [
        {
            name: userParticipantName,
            fullname: 'You',
            isMe: true,
            color: '#1D4ED8',
        },
        llmTools.profile || {
            name: llmParticipantName,
            fullname: llmTools.title || 'AI Assistant',
            color: '#10b981',
        },
    ];
}

/**
 * Resolves teammate metadata from model requirements or TEAM capabilities.
 *
 * @private function of `useLlmChatState`
 */
async function resolveLlmChatTeammates(llmTools: LlmExecutionTools): Promise<TeammatesMap | undefined> {
    const teammateAwareLlmTools: TeammateAwareLlmTools = llmTools;

    if (typeof teammateAwareLlmTools.getModelRequirements === 'function') {
        try {
            const modelRequirements = await teammateAwareLlmTools.getModelRequirements();
            const teammateEntries = modelRequirements?.metadata?.teammates;

            if (teammateEntries && Array.isArray(teammateEntries)) {
                return buildTeammatesMap(teammateEntries);
            }
        } catch (error) {
            console.warn('Failed to load teammates metadata:', error);
        }
    }

    return buildTeammatesMapFromCapabilities(teammateAwareLlmTools.capabilities);
}

/**
 * Loads teammate metadata used by TEAM tool-call UI.
 *
 * @private function of `useLlmChatState`
 */
function useLlmChatTeammates(llmTools: LlmExecutionTools): TeammatesMap | undefined {
    const [teammates, setTeammates] = useState<TeammatesMap | undefined>(undefined);

    useEffect(() => {
        let isMounted = true;

        const teammateLoader = resolveLlmChatTeammates(llmTools).then((resolvedTeammates) => {
            if (!isMounted) {
                return;
            }

            setTeammates(resolvedTeammates);
        });

        return () => {
            isMounted = false;
            void teammateLoader;
        };
    }, [llmTools]);

    return teammates;
}

/**
 * Coordinates derived state and handlers consumed by `<LlmChat/>`.
 *
 * @private function of `<LlmChat/>`
 */
export function useLlmChatState(props: LlmChatProps): UseLlmChatStateResult {
    const {
        llmTools,
        persistenceKey,
        onChange,
        onReset,
        onError,
        initialMessages,
        sendMessage,
        userParticipantName = 'USER',
        llmParticipantName = 'ASSISTANT',
        autoExecuteMessage,
        autoExecuteMessageAttachments,
        thinkingMessages,
        promptParameters,
        chatFailMessage,
        resetMode = 'reset-current',
        participants: providedParticipants,
        thread,
    } = props;
    const resolvedPromptParameters = useMemo(
        () => normalizePromptParameters(promptParameters ?? {}),
        [promptParameters],
    );
    const resolvedChatFailMessage = chatFailMessage || DEFAULT_CHAT_FAIL_MESSAGE;
    const { buildInitialMessages, hasUserInteractedRef, messages, setMessages } = useLlmChatMessages({
        initialMessages,
        persistenceKey,
    });
    const [tasksProgress, setTasksProgress] = useState<Array<LlmChatTaskProgress>>([]);
    const participants = useMemo(
        () =>
            resolveLlmChatParticipants({
                llmParticipantName,
                llmTools,
                providedParticipants,
                userParticipantName,
            }),
        [llmParticipantName, llmTools, providedParticipants, userParticipantName],
    );
    const teammates = useLlmChatTeammates(llmTools);
    const thinkingVariants = useMemo(() => normalizeThinkingMessageVariants(thinkingMessages), [thinkingMessages]);
    const { clearLastFailedMessage, handleMessage, handleStopStreaming, isStreaming } = useLlmChatMessageHandler({
        chatFailMessage: resolvedChatFailMessage,
        hasUserInteractedRef,
        llmParticipantName,
        llmTools,
        messages,
        onError,
        promptParameters: resolvedPromptParameters,
        setMessages,
        setTasksProgress,
        thinkingVariants,
        thread,
        userParticipantName,
    });
    const hasAutoExecutedRef = useRef(false);

    useEffect(() => {
        if (onChange) {
            onChange(messages, participants);
        }
    }, [messages, onChange, participants]);

    const handleReset = useCallback(async () => {
        if (resetMode === 'delegate' && onReset) {
            await onReset();
            return;
        }

        setMessages(buildInitialMessages());
        setTasksProgress([]);
        hasUserInteractedRef.current = false;
        clearLastFailedMessage();

        if (persistenceKey && ChatPersistence.isAvailable()) {
            ChatPersistence.clearMessages(persistenceKey);
        }

        if (onReset) {
            await onReset();
        }
    }, [buildInitialMessages, clearLastFailedMessage, onReset, persistenceKey, resetMode, setMessages]);

    useEffect(() => {
        if (sendMessage && sendMessage._attach) {
            sendMessage._attach(handleMessage);
        }
    }, [handleMessage, sendMessage]);

    useEffect(() => {
        const shouldAutoExecute = Boolean(autoExecuteMessage) || Boolean(autoExecuteMessageAttachments?.length);

        if (!shouldAutoExecute || hasAutoExecutedRef.current) {
            return;
        }

        hasAutoExecutedRef.current = true;
        void handleMessage(autoExecuteMessage ?? '', autoExecuteMessageAttachments);
    }, [autoExecuteMessage, autoExecuteMessageAttachments, handleMessage]);

    return {
        handleMessage,
        handleReset,
        handleStopStreaming,
        isStreaming,
        isVoiceCalling: false,
        messages,
        participants,
        tasksProgress,
        teammates,
    };
}
