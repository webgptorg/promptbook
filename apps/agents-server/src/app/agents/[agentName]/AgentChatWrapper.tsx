'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import type { ToolCall } from '@promptbook-local/types';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useSelfLearningPreferences } from '../../../components/SelfLearningPreferences/SelfLearningPreferencesProvider';
import { useSoundSystem } from '../../../components/SoundSystemProvider/SoundSystemProvider';
import { createDefaultChatEffects } from '../../../utils/chat/createDefaultChatEffects';
import { reportClientVersionMismatch } from '../../../utils/clientVersionClient';
import type { FriendlyErrorMessage } from '../../../utils/errorMessages';
import { handleChatError } from '../../../utils/errorMessages';
import {
    serializeUserLocationPromptParameter,
    USER_LOCATION_PROMPT_PARAMETER,
    type UserLocationPromptParameter,
} from '../../../utils/userLocationPromptParameter';
import { chatFileUploadHandler } from '../../../utils/upload/createBookEditorUploadHandler';

type AgentChatWrapperProps = {
    agentUrl: string_agent_url;
    defaultMessage?: string;
    autoExecuteMessage?: string;
    brandColor?: string;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    persistenceKey?: string;
    onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
    /**
     * When `false`, disables the chat upload UI even if file uploads are otherwise configured.
     */
    areFileAttachmentsEnabled?: boolean;
    /**
     * When `false`, hides the feedback UI (star button) inside the chat.
     */
    isFeedbackEnabled?: boolean;
    chatFailMessage?: string;
};

/**
 * Tool function name used by USE USER LOCATION.
 */
const USER_LOCATION_TOOL_NAME = 'get_user_location';

/**
 * Location-tool status that means browser should request geolocation.
 */
const USER_LOCATION_UNAVAILABLE_STATUS = 'unavailable';

/**
 * Geolocation error code for denied permissions.
 */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

/**
 * Timeout used for browser geolocation lookup.
 */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Location tool result payload shape.
 */
type UserLocationToolResult = {
    status?: string;
};

/**
 * Parses location tool result into structured object.
 */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    if (!result) {
        return null;
    }

    if (typeof result === 'object') {
        return result as UserLocationToolResult;
    }

    if (typeof result !== 'string') {
        return null;
    }

    try {
        const parsed = JSON.parse(result);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed as UserLocationToolResult;
    } catch {
        return null;
    }
}

/**
 * Builds a stable marker for one location tool call so it is handled at most once.
 */
function createLocationToolCallMarker(toolCall: ToolCall): string {
    const resultMarker = typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result ?? null);
    return `${toolCall.name}|${toolCall.createdAt || ''}|${resultMarker}`;
}

/**
 * Returns true when this tool call should trigger browser geolocation request.
 */
function shouldRequestBrowserUserLocation(toolCall: ToolCall): boolean {
    if (toolCall.name !== USER_LOCATION_TOOL_NAME) {
        return false;
    }

    const parsedResult = parseUserLocationToolResult(toolCall.result);
    return parsedResult?.status === USER_LOCATION_UNAVAILABLE_STATUS;
}

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const {
        agentUrl,
        defaultMessage,
        autoExecuteMessage,
        brandColor,
        thinkingMessages,
        speechRecognitionLanguage,
        persistenceKey,
        onMessagesChange,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        chatFailMessage,
    } = props;

    const shouldEnableFeedback = isFeedbackEnabled ?? true;
    const { backgroundImage, brandColorHex, brandColorLightHex, brandColorDarkHex } = useAgentBackground(brandColor);
    const allowFileAttachments = areFileAttachmentsEnabled ?? true;

    const chatBackgroundStyle: CSSProperties & Record<string, string> = {
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '--agent-chat-brand-color': brandColorHex,
        '--agent-chat-brand-color-light': brandColorLightHex,
        '--agent-chat-brand-color-dark': brandColorDarkHex,
    };

    const agentPromise = useMemo(
        () =>
            RemoteAgent.connect({
                agentUrl,
                isVerbose: true,
            }),
        [agentUrl],
    );

    const { value: agent } = usePromise(agentPromise, [agentPromise]);

    // Error state management
    const [currentError, setCurrentError] = useState<FriendlyErrorMessage | null>(null);
    const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);
    const [chatKey, setChatKey] = useState<number>(0);
    const [userLocationPromptParameter, setUserLocationPromptParameter] = useState<UserLocationPromptParameter | null>(
        null,
    );
    const isLocationRequestInFlightRef = useRef(false);
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());

    const handleFeedback = useCallback(
        async (feedback: {
            message: ChatMessage;
            rating: number;
            textRating: string;
            chatThread: string;
            expectedAnswer: string | null;
            url: string;
        }): Promise<void> => {
            if (!agent) {
                throw new Error('Agent is not ready to receive feedback.');
            }

            const response = await fetch(`${agentUrl}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating: feedback.rating.toString(),
                    textRating: feedback.textRating,
                    chatThread: feedback.chatThread,
                    userNote: feedback.textRating,
                    expectedAnswer: feedback.expectedAnswer,
                    agentHash: agent.agentHash,
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(payload?.message ?? 'Failed to save feedback.');
            }
        },
        [agent, agentUrl],
    );

    // Remove the 'message' query parameter from URL after auto-executing a message
    useEffect(() => {
        if (autoExecuteMessage && typeof window !== 'undefined') {
            // Wait for the message to be processed, then remove the query parameter
            const timer = setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('message');
                window.history.replaceState({}, '', url.toString());
            }, 1000); // 1 second delay to ensure message processing is complete

            return () => clearTimeout(timer);
        }
    }, [autoExecuteMessage]);

    const handleFileUpload = useCallback(async (file: File) => {
        return chatFileUploadHandler(file);
    }, []);

    const isSpeechFeaturesEnabled = agent?.isVoiceTtsSttEnabled ?? false;
    const speechRecognition = useMemo(() => {
        if (typeof window === 'undefined' || !isSpeechFeaturesEnabled) {
            return undefined;
        }

        // Note: [🧠] We could have a mechanism to check if OPENAI_API_KEY is set on the server
        //       For now, we always provide OpenAiSpeechRecognition which uses proxy
        return new OpenAiSpeechRecognition();
    }, [isSpeechFeaturesEnabled]);

    const effectConfigs = useMemo(() => createDefaultChatEffects(), []);
    const { soundSystem } = useSoundSystem();
    const { isSelfLearningEnabled } = useSelfLearningPreferences();
    const { isPrivateModeEnabled } = usePrivateModePreferences();
    const effectiveSelfLearningEnabled = isSelfLearningEnabled && !isPrivateModeEnabled;

    // Handle errors from chat
    const handleError = useCallback((error: unknown, retry: () => void) => {
        if (error instanceof ClientVersionMismatchError) {
            reportClientVersionMismatch({
                requiredVersion: error.requiredVersion,
                reportedVersion: error.reportedVersion,
                message: error.message,
            });
            return;
        }

        const friendlyError = handleChatError(error, 'AgentChatWrapper');
        setCurrentError(friendlyError);
        setRetryCallback(() => retry);
    }, []);

    // Handle error dialog dismiss
    const handleDismissError = useCallback(() => {
        setCurrentError(null);
        setRetryCallback(null);
    }, []);

    // Handle retry from error dialog
    const handleRetry = useCallback(() => {
        if (retryCallback) {
            retryCallback();
        }
    }, [retryCallback]);

    // Handle reset from error dialog
    const handleReset = useCallback(() => {
        setChatKey((prevKey) => prevKey + 1); // Increment key to force re-mount
    }, []);

    /**
     * Requests geolocation from browser and stores it for next prompt calls.
     */
    const requestBrowserUserLocation = useCallback(async () => {
        if (isLocationRequestInFlightRef.current) {
            return;
        }

        if (typeof window === 'undefined' || !navigator.geolocation) {
            setUserLocationPromptParameter({
                permission: 'unavailable',
            });
            return;
        }

        isLocationRequestInFlightRef.current = true;

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: GEOLOCATION_REQUEST_TIMEOUT_MS,
                    maximumAge: 0,
                });
            });

            setUserLocationPromptParameter({
                permission: 'granted',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
                altitudeMeters: position.coords.altitude,
                headingDegrees: position.coords.heading,
                speedMetersPerSecond: position.coords.speed,
                timestamp: new Date(position.timestamp).toISOString(),
            });
        } catch (error) {
            const geolocationError = error as GeolocationPositionError;
            const permission = geolocationError?.code === GEOLOCATION_PERMISSION_DENIED_CODE ? 'denied' : 'unavailable';
            setUserLocationPromptParameter({ permission });
        } finally {
            isLocationRequestInFlightRef.current = false;
        }
    }, []);

    /**
     * Finds the newest location-tool call that asks for browser location.
     */
    const findPendingLocationToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        for (let index = messages.length - 1; index >= 0; index--) {
            const message = messages[index];
            if (!message) {
                continue;
            }

            const toolCalls = message.toolCalls || message.completedToolCalls;
            if (!toolCalls || toolCalls.length === 0) {
                continue;
            }

            for (const toolCall of toolCalls) {
                if (shouldRequestBrowserUserLocation(toolCall)) {
                    return toolCall;
                }
            }
        }

        return null;
    }, []);

    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);

            const toolCall = findPendingLocationToolCall(messages);
            if (!toolCall) {
                return;
            }

            const marker = createLocationToolCallMarker(toolCall);
            if (handledLocationToolCallMarkersRef.current.has(marker)) {
                return;
            }
            handledLocationToolCallMarkersRef.current.add(marker);

            if (userLocationPromptParameter?.permission) {
                return;
            }

            void requestBrowserUserLocation();
        },
        [findPendingLocationToolCall, onMessagesChange, requestBrowserUserLocation, userLocationPromptParameter],
    );

    const promptParameters = useMemo(() => {
        const parameters: Record<string, unknown> = {
            selfLearningEnabled: effectiveSelfLearningEnabled,
        };

        if (userLocationPromptParameter) {
            parameters[USER_LOCATION_PROMPT_PARAMETER] =
                serializeUserLocationPromptParameter(userLocationPromptParameter);
        }

        return parameters;
    }, [effectiveSelfLearningEnabled, userLocationPromptParameter]);

    if (!agent) {
        return <>{/* <- TODO: [🐱‍🚀] <PromptbookLoading /> */}</>;
    }

    return (
        <>
            <AgentChat
                key={chatKey}
                className={`w-full h-full`}
                style={chatBackgroundStyle}
                agent={agent}
                onFeedback={shouldEnableFeedback ? handleFeedback : undefined}
                onFileUpload={allowFileAttachments ? handleFileUpload : undefined}
                onError={handleError}
                defaultMessage={defaultMessage}
                autoExecuteMessage={autoExecuteMessage}
                persistenceKey={persistenceKey}
                onChange={handleMessagesChange}
                speechRecognition={speechRecognition}
                visual="FULL_PAGE"
                effectConfigs={effectConfigs}
                soundSystem={soundSystem}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isSpeechPlaybackEnabled={isSpeechFeaturesEnabled}
                chatFailMessage={chatFailMessage}
                promptParameters={promptParameters}
            />
            <ChatErrorDialog
                error={currentError}
                onRetry={handleRetry}
                onReset={handleReset}
                onDismiss={handleDismissError}
            />
        </>
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
