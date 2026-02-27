'use client';

import { usePromise } from '@common/hooks/usePromise';
import { AgentChat, ChatMessage, useSendMessageToLlmChat } from '@promptbook-local/components';
import { RemoteAgent } from '@promptbook-local/core';
import type { ToolCall } from '@promptbook-local/types';
import { ClientVersionMismatchError } from '@promptbook-local/utils';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
    PSEUDO_AGENT_USER_URL,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import { string_agent_url } from '../../../../../../src/types/typeAliases';
import { useAgentBackground } from '../../../components/AgentProfile/useAgentBackground';
import { ChatErrorDialog } from '../../../components/ChatErrorDialog';
import { confirmPrivateModeEnable } from '../../../components/PrivateModePreferences/confirmPrivateModeEnable';
import { usePrivateModePreferences } from '../../../components/PrivateModePreferences/PrivateModePreferencesProvider';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
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
import {
    acceptMetaDisclaimer,
    fetchMetaDisclaimerStatus,
    type MetaDisclaimerStatus,
} from '../../../utils/metaDisclaimerClient';
import { MetaDisclaimerDialog } from './MetaDisclaimerDialog';
import { PseudoUserChatDialog } from './PseudoUserChatDialog';
import {
    WalletRecordDialog,
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from './WalletRecordDialog';

type AgentChatWrapperProps = {
    agentName: string;
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
    /**
     * Optional handler for "New chat" action emitted from chat action bar.
     *
     * When provided, wrapper delegates reset behavior to the caller so the
     * current chat can stay immutable and a fresh chat can be created instead.
     */
    onStartNewChat?: () => Promise<void> | void;
    /**
     * Called once when an auto-execute message becomes eligible for dispatch.
     */
    onAutoExecuteMessageConsumed?: () => void;
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
 * Tool function name used by USE PRIVACY.
 */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on';

/**
 * Privacy-tool status that means UI confirmation is required.
 */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';

/**
 * TEAM pseudo-user interaction marker emitted by TEAM commitment tools.
 */
const PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND = 'PSEUDO_USER_SINGLE_MESSAGE';

/**
 * Geolocation error code for denied permissions.
 */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

/**
 * Timeout used for browser geolocation lookup.
 */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Wallet request status emitted by `request_wallet_record` tool.
 */
const WALLET_REQUESTED_STATUS = 'requested';

/**
 * Project-tool status emitted when wallet credentials are missing.
 */
const PROJECT_WALLET_CREDENTIAL_REQUIRED_STATUS = 'wallet-credential-required';

/**
 * Wallet service identifier for USE PROJECT credentials.
 */
const USE_PROJECT_GITHUB_WALLET_SERVICE = 'github';

/**
 * Wallet key identifier for USE PROJECT credentials.
 */
const USE_PROJECT_GITHUB_WALLET_KEY = 'use-project-github-token';

/**
 * Location tool result payload shape.
 */
type UserLocationToolResult = {
    status?: string;
};

/**
 * Privacy tool result payload shape.
 */
type PrivacyToolResult = {
    status?: string;
};

/**
 * TEAM tool payload shape used to detect pseudo-user prompts.
 */
type TeamToolResult = {
    teammate?: {
        url?: string;
        label?: string;
    };
    request?: string;
    interaction?: {
        kind?: string;
        prompt?: string;
    };
};

/**
 * Wallet tool payload shape used to trigger credential popup.
 */
type WalletToolResult = {
    status?: string;
    request?: {
        recordType?: string;
        service?: string;
        key?: string;
        message?: string;
        isGlobal?: boolean;
    };
    recordType?: string;
    service?: string;
    key?: string;
    message?: string;
    repository?: string;
};

/**
 * Parses a tool result payload into an object when possible.
 */
function parseToolResultObject(result: unknown): Record<string, unknown> | null {
    if (!result) {
        return null;
    }

    if (typeof result === 'object') {
        return result as Record<string, unknown>;
    }

    if (typeof result !== 'string') {
        return null;
    }

    try {
        const parsed = JSON.parse(result);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

/**
 * Parses location tool result into structured object.
 */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    return parseToolResultObject(result) as UserLocationToolResult | null;
}

/**
 * Parses privacy tool result into structured object.
 */
function parsePrivacyToolResult(result: unknown): PrivacyToolResult | null {
    return parseToolResultObject(result) as PrivacyToolResult | null;
}

/**
 * Parses TEAM tool result into structured object.
 */
function parseTeamToolResult(result: unknown): TeamToolResult | null {
    return parseToolResultObject(result) as TeamToolResult | null;
}

/**
 * Parses wallet tool result into structured object.
 */
function parseWalletToolResult(result: unknown): WalletToolResult | null {
    return parseToolResultObject(result) as WalletToolResult | null;
}

/**
 * Builds a stable marker for one tool call so it is handled at most once.
 */
function createToolCallMarker(toolCall: ToolCall): string {
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

/**
 * Returns true when this tool call should trigger private mode confirmation in UI.
 */
function shouldRequestPrivateModeEnable(toolCall: ToolCall): boolean {
    if (toolCall.name !== TURN_PRIVACY_ON_TOOL_NAME) {
        return false;
    }

    const parsedResult = parsePrivacyToolResult(toolCall.result);
    return parsedResult?.status === PRIVACY_CONFIRMATION_REQUIRED_STATUS;
}

/**
 * Returns true when this tool call asks the real user for one pseudo-team reply.
 */
function shouldRequestPseudoUserReply(toolCall: ToolCall): boolean {
    if (!toolCall.name.startsWith('team_chat_')) {
        return false;
    }

    const parsedResult = parseTeamToolResult(toolCall.result);
    if (!parsedResult?.teammate?.url) {
        return false;
    }

    const pseudoAgentKind = resolvePseudoAgentKindFromUrl(parsedResult.teammate.url);
    if (pseudoAgentKind !== 'USER' && parsedResult.teammate.url !== PSEUDO_AGENT_USER_URL) {
        return false;
    }

    return parsedResult.interaction?.kind === PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND;
}

/**
 * Returns true when wallet-request tool asks the UI to collect credentials.
 */
function shouldRequestWalletRecord(toolCall: ToolCall): boolean {
    if (toolCall.name !== 'request_wallet_record') {
        return false;
    }

    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_REQUESTED_STATUS;
}

/**
 * Returns true when USE PROJECT reports missing wallet credentials.
 */
function shouldRequestWalletRecordForProject(toolCall: ToolCall): boolean {
    if (!toolCall.name.startsWith('project_')) {
        return false;
    }

    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === PROJECT_WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/**
 * Extracts pseudo-user prompt text from TEAM tool result.
 */
function getPseudoUserPromptText(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    const interactionPrompt = parsedResult?.interaction?.prompt?.trim();
    if (interactionPrompt) {
        return interactionPrompt;
    }

    const requestPrompt = parsedResult?.request?.trim();
    if (requestPrompt) {
        return requestPrompt;
    }

    return 'The agent is asking for additional details.';
}

/**
 * Extracts pseudo-user teammate label from TEAM tool result.
 */
function getPseudoUserLabel(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    return parsedResult?.teammate?.label?.trim() || 'User';
}

/**
 * Normalizes wallet record type to one of supported UI values.
 */
function normalizeWalletRecordType(value: unknown): PendingWalletRecordRequest['recordType'] {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (normalized === 'USERNAME_PASSWORD') {
        return 'USERNAME_PASSWORD';
    }
    if (normalized === 'SESSION_COOKIE') {
        return 'SESSION_COOKIE';
    }
    return 'ACCESS_TOKEN';
}

/**
 * Builds pending wallet request payload from tool call result.
 */
function buildPendingWalletRequest(toolCall: ToolCall): PendingWalletRecordRequest {
    const parsedResult = parseWalletToolResult(toolCall.result);
    const requestPayload = parsedResult?.request;

    const sourceService = requestPayload?.service || parsedResult?.service || USE_PROJECT_GITHUB_WALLET_SERVICE;
    const sourceKey = requestPayload?.key || parsedResult?.key || USE_PROJECT_GITHUB_WALLET_KEY;
    const sourceRecordType = requestPayload?.recordType || parsedResult?.recordType || 'ACCESS_TOKEN';
    const sourceMessage = requestPayload?.message || parsedResult?.message;
    const repositoryHint = parsedResult?.repository?.trim();

    const message = repositoryHint
        ? `${sourceMessage || 'Credential required.'}\nRepository: ${repositoryHint}`
        : sourceMessage;

    return {
        marker: createToolCallMarker(toolCall),
        sourceToolName: toolCall.name,
        recordType: normalizeWalletRecordType(sourceRecordType),
        service: sourceService,
        key: sourceKey,
        message,
        isGlobal: requestPayload?.isGlobal === true,
    };
}

/**
 * Finds the newest tool call matching the supplied predicate.
 */
function findNewestMatchingToolCall(
    messages: ReadonlyArray<ChatMessage>,
    predicate: (toolCall: ToolCall) => boolean,
): ToolCall | null {
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
            if (predicate(toolCall)) {
                return toolCall;
            }
        }
    }

    return null;
}

/**
 * Pending pseudo-user interaction extracted from TEAM tool result.
 */
type PendingPseudoUserInteraction = {
    /**
     * Stable tool-call marker used for deduplication.
     */
    marker: string;
    /**
     * Prompt text shown inside the modal.
     */
    prompt: string;
    /**
     * Display name of the speaking agent.
     */
    agentName: string;
    /**
     * Display label of the pseudo teammate (`User`).
     */
    teammateLabel: string;
};

// TODO: [🐱‍🚀] Rename to AgentChatSomethingWrapper

export function AgentChatWrapper(props: AgentChatWrapperProps) {
    const {
        agentName,
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
        onStartNewChat,
        onAutoExecuteMessageConsumed,
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
    const [metaDisclaimerStatus, setMetaDisclaimerStatus] = useState<MetaDisclaimerStatus | null>(null);
    const [isMetaDisclaimerLoading, setIsMetaDisclaimerLoading] = useState(true);
    const [isMetaDisclaimerAccepting, setIsMetaDisclaimerAccepting] = useState(false);
    const [metaDisclaimerError, setMetaDisclaimerError] = useState<string | null>(null);
    const sendMessage = useSendMessageToLlmChat();
    const isLocationRequestInFlightRef = useRef(false);
    const isPrivacyConfirmationInFlightRef = useRef(false);
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPrivacyToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPseudoUserToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledWalletToolCallMarkersRef = useRef<Set<string>>(new Set());
    const [pendingPseudoUserInteraction, setPendingPseudoUserInteraction] =
        useState<PendingPseudoUserInteraction | null>(null);
    const [pendingWalletRequest, setPendingWalletRequest] = useState<PendingWalletRecordRequest | null>(null);
    const hasReportedAutoExecuteMessageRef = useRef(false);
    const lastAutoExecuteMessageRef = useRef<string | undefined>(autoExecuteMessage);

    /**
     * Loads disclaimer status for the current user and agent.
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
        isMetaDisclaimerLoading || metaDisclaimerError !== null || (isMetaDisclaimerEnabled && !hasAcceptedMetaDisclaimer);
    const metaDisclaimerMarkdown = metaDisclaimerStatus?.markdown || null;
    const effectiveAutoExecuteMessage = isMetaDisclaimerBlockingChat ? undefined : autoExecuteMessage;

    useEffect(() => {
        if (lastAutoExecuteMessageRef.current === autoExecuteMessage) {
            return;
        }

        lastAutoExecuteMessageRef.current = autoExecuteMessage;
        hasReportedAutoExecuteMessageRef.current = false;
    }, [autoExecuteMessage]);

    useEffect(() => {
        if (!effectiveAutoExecuteMessage) {
            return;
        }

        if (hasReportedAutoExecuteMessageRef.current) {
            return;
        }

        hasReportedAutoExecuteMessageRef.current = true;
        onAutoExecuteMessageConsumed?.();
    }, [effectiveAutoExecuteMessage, onAutoExecuteMessageConsumed]);

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
        if (effectiveAutoExecuteMessage && typeof window !== 'undefined') {
            // Wait for the message to be processed, then remove the query parameter
            const timer = setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('message');
                window.history.replaceState({}, '', url.toString());
            }, 1000); // 1 second delay to ensure message processing is complete

            return () => clearTimeout(timer);
        }
    }, [effectiveAutoExecuteMessage]);

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
    const { isPrivateModeEnabled, setIsPrivateModeEnabled } = usePrivateModePreferences();
    const { t } = useServerLanguage();
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
     * Asks the user to confirm enabling private mode and enables it on confirmation.
     */
    const requestPrivateModeEnableConfirmation = useCallback(async () => {
        if (isPrivateModeEnabled || isPrivacyConfirmationInFlightRef.current) {
            return;
        }

        isPrivacyConfirmationInFlightRef.current = true;

        try {
            const isConfirmed = await confirmPrivateModeEnable(t);
            if (!isConfirmed) {
                return;
            }

            setIsPrivateModeEnabled(true);
        } finally {
            isPrivacyConfirmationInFlightRef.current = false;
        }
    }, [isPrivateModeEnabled, setIsPrivateModeEnabled, t]);

    /**
     * Finds the newest location-tool call that asks for browser location.
     */
    const findPendingLocationToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestBrowserUserLocation);
    }, []);

    /**
     * Finds the newest privacy-tool call that asks for private mode confirmation.
     */
    const findPendingPrivacyToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPrivateModeEnable);
    }, []);

    /**
     * Finds the newest pseudo-user TEAM tool call that requests one user reply.
     */
    const findPendingPseudoUserToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPseudoUserReply);
    }, []);

    /**
     * Finds the newest wallet-related tool call asking for credentials.
     */
    const findPendingWalletToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(
            messages,
            (toolCall) => shouldRequestWalletRecord(toolCall) || shouldRequestWalletRecordForProject(toolCall),
        );
    }, []);

    const handleMessagesChange = useCallback(
        (messages: ReadonlyArray<ChatMessage>) => {
            onMessagesChange?.(messages);

            const locationToolCall = findPendingLocationToolCall(messages);
            if (locationToolCall) {
                const locationMarker = createToolCallMarker(locationToolCall);
                if (!handledLocationToolCallMarkersRef.current.has(locationMarker)) {
                    handledLocationToolCallMarkersRef.current.add(locationMarker);

                    if (!userLocationPromptParameter?.permission) {
                        void requestBrowserUserLocation();
                    }
                }
            }

            const privacyToolCall = findPendingPrivacyToolCall(messages);
            if (privacyToolCall) {
                const privacyMarker = createToolCallMarker(privacyToolCall);
                if (!handledPrivacyToolCallMarkersRef.current.has(privacyMarker)) {
                    handledPrivacyToolCallMarkersRef.current.add(privacyMarker);
                    void requestPrivateModeEnableConfirmation();
                }
            }

            const pseudoUserToolCall = findPendingPseudoUserToolCall(messages);
            if (!pseudoUserToolCall) {
                const walletToolCall = findPendingWalletToolCall(messages);
                if (!walletToolCall) {
                    return;
                }

                const walletMarker = createToolCallMarker(walletToolCall);
                if (handledWalletToolCallMarkersRef.current.has(walletMarker)) {
                    return;
                }

                handledWalletToolCallMarkersRef.current.add(walletMarker);
                setPendingWalletRequest(buildPendingWalletRequest(walletToolCall));
                return;
            }

            const pseudoUserMarker = createToolCallMarker(pseudoUserToolCall);
            if (handledPseudoUserToolCallMarkersRef.current.has(pseudoUserMarker)) {
                return;
            }
            handledPseudoUserToolCallMarkersRef.current.add(pseudoUserMarker);

            setPendingPseudoUserInteraction({
                marker: pseudoUserMarker,
                prompt: getPseudoUserPromptText(pseudoUserToolCall),
                agentName: agent?.meta.fullname || agent?.agentName || 'Agent',
                teammateLabel: getPseudoUserLabel(pseudoUserToolCall),
            });
        },
        [
            agent?.agentName,
            agent?.meta.fullname,
            findPendingLocationToolCall,
            findPendingPrivacyToolCall,
            findPendingPseudoUserToolCall,
            onMessagesChange,
            requestBrowserUserLocation,
            requestPrivateModeEnableConfirmation,
            userLocationPromptParameter,
            findPendingWalletToolCall,
        ],
    );

    /**
     * Sends one pseudo-user reply back to the main chat and closes the modal.
     */
    const handlePseudoUserReplySubmit = useCallback(
        async (reply: string) => {
            setPendingPseudoUserInteraction(null);
            sendMessage(reply);
        },
        [sendMessage],
    );

    /**
     * Dismisses the pseudo-user reply modal without sending a message.
     */
    const handlePseudoUserReplyClose = useCallback(() => {
        setPendingPseudoUserInteraction(null);
    }, []);

    /**
     * Stores one wallet credential submitted from the popup and asks agent to continue.
     */
    const handleWalletRequestSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            const currentAgentPermanentId =
                typeof (agent as { permanentId?: unknown } | undefined)?.permanentId === 'string'
                    ? ((agent as { permanentId?: string }).permanentId as string)
                    : undefined;
            const shouldStoreGlobally = payload.isGlobal || !currentAgentPermanentId;

            const response = await fetch('/api/user-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recordType: payload.recordType,
                    service: payload.service,
                    key: payload.key,
                    username: payload.username,
                    password: payload.password,
                    secret: payload.secret,
                    cookies: payload.cookies,
                    isGlobal: shouldStoreGlobally,
                    agentPermanentId: shouldStoreGlobally ? null : currentAgentPermanentId,
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || 'Failed to store wallet record.');
            }

            setPendingWalletRequest(null);
            sendMessage('Wallet credential saved. Continue with the previous task.');
        },
        [agent, sendMessage],
    );

    /**
     * Dismisses wallet request popup without saving.
     */
    const handleWalletRequestClose = useCallback(() => {
        setPendingWalletRequest(null);
    }, []);

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
                autoExecuteMessage={effectiveAutoExecuteMessage}
                persistenceKey={persistenceKey}
                onChange={handleMessagesChange}
                sendMessage={sendMessage}
                speechRecognition={speechRecognition}
                visual="FULL_PAGE"
                effectConfigs={effectConfigs}
                soundSystem={soundSystem}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                isSpeechPlaybackEnabled={isSpeechFeaturesEnabled}
                chatFailMessage={chatFailMessage}
                promptParameters={promptParameters}
                onReset={onStartNewChat}
                resetMode={onStartNewChat ? 'delegate' : undefined}
            />
            <PseudoUserChatDialog
                isOpen={pendingPseudoUserInteraction !== null}
                prompt={pendingPseudoUserInteraction?.prompt || ''}
                agentName={pendingPseudoUserInteraction?.agentName || 'Agent'}
                userName={pendingPseudoUserInteraction?.teammateLabel || 'User'}
                onSubmit={handlePseudoUserReplySubmit}
                onClose={handlePseudoUserReplyClose}
            />
            <WalletRecordDialog
                isOpen={pendingWalletRequest !== null}
                request={pendingWalletRequest}
                onSubmit={handleWalletRequestSubmit}
                onClose={handleWalletRequestClose}
            />
            <ChatErrorDialog
                error={currentError}
                onRetry={handleRetry}
                onReset={handleReset}
                onDismiss={handleDismissError}
            />
            {isMetaDisclaimerBlockingChat && (
                <MetaDisclaimerDialog
                    markdown={metaDisclaimerMarkdown}
                    isLoading={isMetaDisclaimerLoading}
                    isAccepting={isMetaDisclaimerAccepting}
                    errorMessage={metaDisclaimerError}
                    onAccept={() => {
                        void handleAcceptMetaDisclaimer();
                    }}
                    onRetry={() => {
                        void loadMetaDisclaimerStatus();
                    }}
                />
            )}
        </>
    );
}

/**
 * TODO: [🚗] Transfer the saving logic to `<BookEditor/>` be aware of CRDT / yjs approach to be implementable in future
 */
