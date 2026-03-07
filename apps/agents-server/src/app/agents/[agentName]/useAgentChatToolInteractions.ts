import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useRef, useState } from 'react';
import {
    PSEUDO_AGENT_USER_URL,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import { confirmPrivateModeEnable } from '../../../components/PrivateModePreferences/confirmPrivateModeEnable';
import type { ServerTranslationKey } from '../../../languages/ServerTranslationKeys';
import type { UserLocationPromptParameter } from '../../../utils/userLocationPromptParameter';

/**
 * Tool function name used by USE USER LOCATION.
 *
 * @private function of AgentChatWrapper
 */
const USER_LOCATION_TOOL_NAME = 'get_user_location';

/**
 * Location-tool status that means browser should request geolocation.
 *
 * @private function of AgentChatWrapper
 */
const USER_LOCATION_UNAVAILABLE_STATUS = 'unavailable';

/**
 * Tool function name used by USE PRIVACY.
 *
 * @private function of AgentChatWrapper
 */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on';

/**
 * Privacy-tool status that means UI confirmation is required.
 *
 * @private function of AgentChatWrapper
 */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';

/**
 * TEAM pseudo-user interaction marker emitted by TEAM commitment tools.
 *
 * @private function of AgentChatWrapper
 */
const PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND = 'PSEUDO_USER_SINGLE_MESSAGE';

/**
 * Geolocation error code for denied permissions.
 *
 * @private function of AgentChatWrapper
 */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1;

/**
 * Timeout used for browser geolocation lookup.
 *
 * @private function of AgentChatWrapper
 */
const GEOLOCATION_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Wallet request status emitted by `request_wallet_record` tool.
 *
 * @private function of AgentChatWrapper
 */
const WALLET_REQUESTED_STATUS = 'requested';

/**
 * Tool status emitted when wallet credentials are missing.
 *
 * @private function of AgentChatWrapper
 */
const WALLET_CREDENTIAL_REQUIRED_STATUS = 'wallet-credential-required';

/**
 * Location tool result payload shape.
 *
 * @private function of AgentChatWrapper
 */
type UserLocationToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * Privacy tool result payload shape.
 *
 * @private function of AgentChatWrapper
 */
type PrivacyToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
};

/**
 * TEAM tool payload shape used to detect pseudo-user prompts.
 *
 * @private function of AgentChatWrapper
 */
type TeamToolResult = {
    /**
     * Teammate metadata from tool response.
     */
    readonly teammate?: {
        /**
         * Teammate URL.
         */
        readonly url?: string;
        /**
         * Teammate label.
         */
        readonly label?: string;
    };
    /**
     * Fallback request prompt.
     */
    readonly request?: string;
    /**
     * Structured interaction request details.
     */
    readonly interaction?: {
        /**
         * Interaction kind.
         */
        readonly kind?: string;
        /**
         * Prompt text requested from user.
         */
        readonly prompt?: string;
    };
};

/**
 * Wallet tool payload shape used to trigger credential popup.
 *
 * @private function of AgentChatWrapper
 */
type WalletToolResult = {
    /**
     * Tool status indicator.
     */
    readonly status?: string;
    /**
     * Nested wallet request payload.
     */
    readonly request?: {
        /**
         * Requested record type.
         */
        readonly recordType?: string;
        /**
         * Requested service.
         */
        readonly service?: string;
        /**
         * Requested key.
         */
        readonly key?: string;
        /**
         * Optional JSON schema for credential structure.
         */
        readonly jsonSchema?: unknown;
        /**
         * Optional user-facing message.
         */
        readonly message?: string;
        /**
         * User-scoped storage hint.
         */
        readonly isUserScoped?: boolean;
        /**
         * Global-scoped storage hint.
         */
        readonly isGlobal?: boolean;
    };
    /**
     * Flattened record type.
     */
    readonly recordType?: string;
    /**
     * Flattened service.
     */
    readonly service?: string;
    /**
     * Flattened key.
     */
    readonly key?: string;
    /**
     * Flattened JSON schema.
     */
    readonly jsonSchema?: unknown;
    /**
     * Flattened message.
     */
    readonly message?: string;
    /**
     * Flattened user-scope hint.
     */
    readonly isUserScoped?: boolean;
    /**
     * Flattened global-scope hint.
     */
    readonly isGlobal?: boolean;
    /**
     * Optional repository hint.
     */
    readonly repository?: string;
};

/**
 * Lightweight agent shape consumed by the hook.
 *
 * @private function of AgentChatWrapper
 */
type AgentChatToolInteractionAgent = {
    /**
     * Agent canonical name.
     */
    readonly agentName?: string;
    /**
     * Agent metadata.
     */
    readonly meta?: {
        /**
         * Agent display name.
         */
        readonly fullname?: string;
    };
};

/**
 * Input options consumed by `useAgentChatToolInteractions`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatToolInteractionsProps = {
    /**
     * Current connected agent.
     */
    readonly agent: AgentChatToolInteractionAgent | null | undefined;
    /**
     * Existing chat on-change callback from parent.
     */
    readonly onMessagesChange?: (messages: ReadonlyArray<ChatMessage>) => void;
    /**
     * Function used to send one message into chat.
     */
    readonly sendMessage: (message: string) => void;
    /**
     * Currently resolved permanent id of the active agent.
     */
    readonly currentAgentPermanentId: string | undefined;
    /**
     * Current private-mode state.
     */
    readonly isPrivateModeEnabled: boolean;
    /**
     * Private-mode setter from preferences.
     */
    readonly setIsPrivateModeEnabled: (isPrivateModeEnabled: boolean) => void;
    /**
     * Localization formatter used by the privacy-confirmation dialog.
     */
    readonly t: (key: ServerTranslationKey) => string;
};

/**
 * Pending pseudo-user interaction extracted from TEAM tool result.
 *
 * @private function of AgentChatWrapper
 */
type PendingPseudoUserInteraction = {
    /**
     * Stable tool-call marker used for deduplication.
     */
    readonly marker: string;
    /**
     * Prompt text shown inside the modal.
     */
    readonly prompt: string;
    /**
     * Display name of the speaking agent.
     */
    readonly agentName: string;
    /**
     * Display label of the pseudo teammate (`User`).
     */
    readonly teammateLabel: string;
};

/**
 * Result object returned by `useAgentChatToolInteractions`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatToolInteractionsResult = {
    /**
     * User-location prompt parameter shared with the chat prompt.
     */
    readonly userLocationPromptParameter: UserLocationPromptParameter | null;
    /**
     * Pending pseudo-user interaction payload.
     */
    readonly pendingPseudoUserInteraction: PendingPseudoUserInteraction | null;
    /**
     * Pending wallet request payload.
     */
    readonly pendingWalletRequest: PendingWalletRecordRequest | null;
    /**
     * Chat on-change callback that triggers tool side effects.
     */
    readonly handleMessagesChange: (messages: ReadonlyArray<ChatMessage>) => void;
    /**
     * Submits pseudo-user reply.
     */
    readonly handlePseudoUserReplySubmit: (reply: string) => Promise<void>;
    /**
     * Closes pseudo-user dialog.
     */
    readonly handlePseudoUserReplyClose: () => void;
    /**
     * Persists wallet record and resumes chat.
     */
    readonly handleWalletRequestSubmit: (payload: WalletRecordDialogSubmitPayload) => Promise<void>;
    /**
     * Closes wallet request dialog.
     */
    readonly handleWalletRequestClose: () => void;
};

/**
 * Parses a tool result payload into an object when possible.
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
 */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    return parseToolResultObject(result) as UserLocationToolResult | null;
}

/**
 * Parses privacy tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parsePrivacyToolResult(result: unknown): PrivacyToolResult | null {
    return parseToolResultObject(result) as PrivacyToolResult | null;
}

/**
 * Parses TEAM tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parseTeamToolResult(result: unknown): TeamToolResult | null {
    return parseToolResultObject(result) as TeamToolResult | null;
}

/**
 * Parses wallet tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parseWalletToolResult(result: unknown): WalletToolResult | null {
    return parseToolResultObject(result) as WalletToolResult | null;
}

/**
 * Builds a stable marker for one tool call so it is handled at most once.
 *
 * @private function of AgentChatWrapper
 */
function createToolCallMarker(toolCall: ToolCall): string {
    const resultMarker = typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result ?? null);
    return `${toolCall.name}|${toolCall.createdAt || ''}|${resultMarker}`;
}

/**
 * Returns true when this tool call should trigger browser geolocation request.
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
 */
function shouldRequestWalletRecord(toolCall: ToolCall): boolean {
    if (toolCall.name !== 'request_wallet_record') {
        return false;
    }

    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_REQUESTED_STATUS;
}

/**
 * Returns true when tool result indicates missing wallet credentials.
 *
 * @private function of AgentChatWrapper
 */
function shouldRequestWalletCredential(toolCall: ToolCall): boolean {
    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/**
 * Extracts pseudo-user prompt text from TEAM tool result.
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
 */
function getPseudoUserLabel(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    return parsedResult?.teammate?.label?.trim() || 'User';
}

/**
 * Normalizes wallet record type to one of supported UI values.
 *
 * @private function of AgentChatWrapper
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
 *
 * @private function of AgentChatWrapper
 */
function buildPendingWalletRequest(toolCall: ToolCall): PendingWalletRecordRequest {
    const parsedResult = parseWalletToolResult(toolCall.result);
    const requestPayload = parsedResult?.request;
    const sourceService = requestPayload?.service || parsedResult?.service || 'generic';
    const sourceKey = requestPayload?.key || parsedResult?.key || 'default';
    const sourceRecordType = requestPayload?.recordType || parsedResult?.recordType || 'ACCESS_TOKEN';
    const sourceJsonSchema = requestPayload?.jsonSchema || parsedResult?.jsonSchema;
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
        jsonSchema: sourceJsonSchema,
        message,
        isUserScoped: requestPayload?.isUserScoped === true || parsedResult?.isUserScoped === true,
        isGlobal: requestPayload?.isGlobal === true || parsedResult?.isGlobal === true,
    };
}

/**
 * Finds the newest tool call matching the supplied predicate.
 *
 * @private function of AgentChatWrapper
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
 * Handles chat tool-call side effects (location, privacy, pseudo-user, wallet) for `AgentChatWrapper`.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatToolInteractions({
    agent,
    onMessagesChange,
    sendMessage,
    currentAgentPermanentId,
    isPrivateModeEnabled,
    setIsPrivateModeEnabled,
    t,
}: UseAgentChatToolInteractionsProps): UseAgentChatToolInteractionsResult {
    const [userLocationPromptParameter, setUserLocationPromptParameter] = useState<UserLocationPromptParameter | null>(
        null,
    );
    const isLocationRequestInFlightRef = useRef(false);
    const isPrivacyConfirmationInFlightRef = useRef(false);
    const handledLocationToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPrivacyToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledPseudoUserToolCallMarkersRef = useRef<Set<string>>(new Set());
    const handledWalletToolCallMarkersRef = useRef<Set<string>>(new Set());
    const [pendingPseudoUserInteraction, setPendingPseudoUserInteraction] = useState<PendingPseudoUserInteraction | null>(
        null,
    );
    const [pendingWalletRequest, setPendingWalletRequest] = useState<PendingWalletRecordRequest | null>(null);

    /**
     * Requests geolocation from browser and stores it for next prompt calls.
     *
     * @private function of AgentChatWrapper
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
     *
     * @private function of AgentChatWrapper
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
     *
     * @private function of AgentChatWrapper
     */
    const findPendingLocationToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestBrowserUserLocation);
    }, []);

    /**
     * Finds the newest privacy-tool call that asks for private mode confirmation.
     *
     * @private function of AgentChatWrapper
     */
    const findPendingPrivacyToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPrivateModeEnable);
    }, []);

    /**
     * Finds the newest pseudo-user TEAM tool call that requests one user reply.
     *
     * @private function of AgentChatWrapper
     */
    const findPendingPseudoUserToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(messages, shouldRequestPseudoUserReply);
    }, []);

    /**
     * Finds the newest wallet-related tool call asking for credentials.
     *
     * @private function of AgentChatWrapper
     */
    const findPendingWalletToolCall = useCallback((messages: ReadonlyArray<ChatMessage>): ToolCall | null => {
        return findNewestMatchingToolCall(
            messages,
            (toolCall) => shouldRequestWalletRecord(toolCall) || shouldRequestWalletCredential(toolCall),
        );
    }, []);

    /**
     * Handles chat message updates and reacts to actionable tool calls.
     *
     * @private function of AgentChatWrapper
     */
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
                agentName: agent?.meta?.fullname || agent?.agentName || 'Agent',
                teammateLabel: getPseudoUserLabel(pseudoUserToolCall),
            });
        },
        [
            agent?.agentName,
            agent?.meta?.fullname,
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
     *
     * @private function of AgentChatWrapper
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
     *
     * @private function of AgentChatWrapper
     */
    const handlePseudoUserReplyClose = useCallback(() => {
        setPendingPseudoUserInteraction(null);
    }, []);

    /**
     * Stores one wallet credential submitted from the popup and asks agent to continue.
     *
     * @private function of AgentChatWrapper
     */
    const handleWalletRequestSubmit = useCallback(
        async (payload: WalletRecordDialogSubmitPayload) => {
            const shouldScopeToAgent = !payload.isGlobal && Boolean(currentAgentPermanentId);
            const isGlobal = !shouldScopeToAgent;

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
                    jsonSchema: payload.jsonSchema,
                    isUserScoped: payload.isUserScoped === true,
                    isGlobal,
                    agentPermanentId: shouldScopeToAgent ? currentAgentPermanentId : null,
                }),
            });

            if (!response.ok) {
                const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(errorPayload?.error || 'Failed to store wallet record.');
            }

            setPendingWalletRequest(null);
            sendMessage('Wallet credential saved. Continue with the previous task.');
        },
        [currentAgentPermanentId, sendMessage],
    );

    /**
     * Dismisses wallet request popup without saving.
     *
     * @private function of AgentChatWrapper
     */
    const handleWalletRequestClose = useCallback(() => {
        setPendingWalletRequest(null);
    }, []);

    return {
        userLocationPromptParameter,
        pendingPseudoUserInteraction,
        pendingWalletRequest,
        handleMessagesChange,
        handlePseudoUserReplySubmit,
        handlePseudoUserReplyClose,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    };
}
