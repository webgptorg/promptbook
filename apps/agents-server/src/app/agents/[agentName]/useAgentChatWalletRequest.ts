import {
    type PendingWalletRecordRequest,
    type WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ToolCall } from '@promptbook-local/types';
import { useCallback, useState } from 'react';
import { createToolCallMarker } from './createToolCallMarker';
import { parseToolResultObject } from './parseToolResultObject';

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
 * Wallet tool payload shape used to trigger credential popup.
 *
 * @private function of AgentChatWrapper
 */
type WalletToolResult = {
    /**
     * Optional action identifier.
     */
    readonly action?: string;
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
    /**
     * Optional calendar provider hint.
     */
    readonly provider?: string;
    /**
     * Optional calendar URL hint.
     */
    readonly calendarUrl?: string;
    /**
     * Optional OAuth scopes requested for calendar access.
     */
    readonly scopes?: unknown;
};

/**
 * Input options consumed by `useAgentChatWalletRequest`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatWalletRequestProps = {
    /**
     * Currently resolved permanent id of the active agent.
     */
    readonly currentAgentPermanentId: string | undefined;
    /**
     * Function used to send one message into chat.
     */
    readonly sendMessage: (message: string) => void;
};

/**
 * Result object returned by `useAgentChatWalletRequest`.
 *
 * @private function of AgentChatWrapper
 */
type UseAgentChatWalletRequestResult = {
    /**
     * Pending wallet request payload.
     */
    readonly pendingWalletRequest: PendingWalletRecordRequest | null;
    /**
     * Opens the wallet request dialog for the supplied tool call.
     */
    readonly openPendingWalletRequest: (toolCall: ToolCall) => void;
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
 * Parses wallet tool result into structured object.
 *
 * @private function of AgentChatWrapper
 */
function parseWalletToolResult(result: unknown): WalletToolResult | null {
    return parseToolResultObject(result) as WalletToolResult | null;
}

/**
 * Returns true when wallet-related tool result asks the UI to collect credentials.
 *
 * @private function of AgentChatWrapper
 */
export function shouldRequestWalletInteraction(toolCall: ToolCall): boolean {
    const parsedResult = parseWalletToolResult(toolCall.result);

    if (toolCall.name === 'request_wallet_record' && parsedResult?.status === WALLET_REQUESTED_STATUS) {
        return true;
    }

    return parsedResult?.status === WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/**
 * Normalizes unknown optional text values.
 *
 * @private function of AgentChatWrapper
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
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
 * Normalizes unknown calendar scopes payload into a unique list.
 *
 * @private function of AgentChatWrapper
 */
function normalizeCalendarScopes(rawScopes: unknown): string[] {
    if (!Array.isArray(rawScopes)) {
        return [];
    }

    const scopes = rawScopes
        .filter((scope): scope is string => typeof scope === 'string')
        .map((scope) => scope.trim())
        .filter(Boolean);

    return [...new Set(scopes)];
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
    const calendarUrlHint = normalizeOptionalText(parsedResult?.calendarUrl);
    const calendarScopes = normalizeCalendarScopes(parsedResult?.scopes);
    const isCalendarAuthRequest =
        normalizeOptionalText(parsedResult?.action)?.toLowerCase() === 'calendar-auth' &&
        normalizeOptionalText(parsedResult?.provider)?.toLowerCase() === 'google';

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
        ...(isCalendarAuthRequest
            ? {
                  calendarOAuth: {
                      provider: 'google' as const,
                      calendarUrl: calendarUrlHint || 'https://calendar.google.com/calendar/u/0/r',
                      scopes:
                          calendarScopes.length > 0
                              ? calendarScopes
                              : ['https://www.googleapis.com/auth/calendar'],
                  },
              }
            : {}),
    };
}

/**
 * Manages wallet credential requests initiated by chat tool calls.
 *
 * @private function of AgentChatWrapper
 */
export function useAgentChatWalletRequest({
    currentAgentPermanentId,
    sendMessage,
}: UseAgentChatWalletRequestProps): UseAgentChatWalletRequestResult {
    const [pendingWalletRequest, setPendingWalletRequest] = useState<PendingWalletRecordRequest | null>(null);

    /**
     * Opens the wallet request popup for one actionable tool call.
     *
     * @private function of AgentChatWrapper
     */
    const openPendingWalletRequest = useCallback((toolCall: ToolCall) => {
        setPendingWalletRequest(buildPendingWalletRequest(toolCall));
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
        pendingWalletRequest,
        openPendingWalletRequest,
        handleWalletRequestSubmit,
        handleWalletRequestClose,
    };
}
