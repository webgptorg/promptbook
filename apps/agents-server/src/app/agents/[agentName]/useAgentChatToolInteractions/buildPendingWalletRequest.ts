import type {
    PendingWalletRecordRequest,
    WalletRecordDialogSubmitPayload,
} from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import type { ToolCall } from '@promptbook-local/types';
import { createToolCallMarker } from './createToolCallMarker';
import { parseToolResultObject } from './parseToolResultObject';

/**
 * Wallet request status emitted by `request_wallet_record` tool.
 */
const WALLET_REQUESTED_STATUS = 'requested';

/**
 * Tool status emitted when wallet credentials are missing.
 */
const WALLET_CREDENTIAL_REQUIRED_STATUS = 'wallet-credential-required';

/**
 * Wallet tool payload shape used to trigger credential popup.
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
 * Normalizes unknown optional text values.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue || null;
}

/**
 * Parses wallet tool result into structured object.
 */
function parseWalletToolResult(result: unknown): WalletToolResult | null {
    return parseToolResultObject(result) as WalletToolResult | null;
}

/**
 * Normalizes wallet record type to one of supported UI values.
 */
function normalizeWalletRecordType(value: unknown): WalletRecordDialogSubmitPayload['recordType'] {
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
 * Returns true when wallet-request tool asks the UI to collect credentials.
 *
 * @private function of useAgentChatToolInteractions
 */
export function shouldRequestWalletRecord(toolCall: ToolCall): boolean {
    if (toolCall.name !== 'request_wallet_record') {
        return false;
    }

    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_REQUESTED_STATUS;
}

/**
 * Returns true when tool result indicates missing wallet credentials.
 *
 * @private function of useAgentChatToolInteractions
 */
export function shouldRequestWalletCredential(toolCall: ToolCall): boolean {
    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/**
 * Builds pending wallet request payload from tool call result.
 *
 * @private function of useAgentChatToolInteractions
 */
export function buildPendingWalletRequest(toolCall: ToolCall): PendingWalletRecordRequest {
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
                      scopes: calendarScopes.length > 0 ? calendarScopes : ['https://www.googleapis.com/auth/calendar'],
                  },
              }
            : {}),
    };
}
