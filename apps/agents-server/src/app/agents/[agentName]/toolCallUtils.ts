import type { ChatMessage } from '@promptbook-local/components';
import type { ToolCall } from '@promptbook-local/types';
import type { PendingWalletRecordRequest } from '@/src/components/WalletRecordDialog/WalletRecordDialog';
import {
    PSEUDO_AGENT_USER_URL,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../../src/book-2.0/agent-source/pseudoAgentReferences';

/** Tool function name used by USE USER LOCATION. */
const USER_LOCATION_TOOL_NAME = 'get_user_location';
/** Location-tool status that means browser should request geolocation. */
const USER_LOCATION_UNAVAILABLE_STATUS = 'unavailable';
/** Tool function name used by USE PRIVACY. */
const TURN_PRIVACY_ON_TOOL_NAME = 'turn_privacy_on';
/** Privacy-tool status that means UI confirmation is required. */
const PRIVACY_CONFIRMATION_REQUIRED_STATUS = 'confirmation-required';
/** TEAM pseudo-user interaction marker emitted by TEAM commitment tools. */
const PSEUDO_USER_SINGLE_MESSAGE_INTERACTION_KIND = 'PSEUDO_USER_SINGLE_MESSAGE';
/** Wallet request status emitted by `request_wallet_record` tool. */
const WALLET_REQUESTED_STATUS = 'requested';
/** Tool status emitted when wallet credentials are missing. */
const WALLET_CREDENTIAL_REQUIRED_STATUS = 'wallet-credential-required';

/**
 * Location tool result payload shape.
 *
 * @private type for toolCallUtils
 */
type UserLocationToolResult = {
    status?: string;
};

/**
 * Privacy tool result payload shape.
 *
 * @private type for toolCallUtils
 */
type PrivacyToolResult = {
    status?: string;
};

/**
 * TEAM tool payload shape used to detect pseudo-user prompts.
 *
 * @private type for toolCallUtils
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
 *
 * @private type for toolCallUtils
 */
type WalletToolResult = {
    status?: string;
    request?: {
        recordType?: string;
        service?: string;
        key?: string;
        jsonSchema?: unknown;
        message?: string;
        isUserScoped?: boolean;
        isGlobal?: boolean;
    };
    recordType?: string;
    service?: string;
    key?: string;
    jsonSchema?: unknown;
    message?: string;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    repository?: string;
};

/**
 * Parses a tool result payload into an object when possible.
 *
 * @private function of toolCallUtils
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

/** @private function of toolCallUtils */
function parseUserLocationToolResult(result: unknown): UserLocationToolResult | null {
    return parseToolResultObject(result) as UserLocationToolResult | null;
}

/** @private function of toolCallUtils */
function parsePrivacyToolResult(result: unknown): PrivacyToolResult | null {
    return parseToolResultObject(result) as PrivacyToolResult | null;
}

/** @private function of toolCallUtils */
function parseTeamToolResult(result: unknown): TeamToolResult | null {
    return parseToolResultObject(result) as TeamToolResult | null;
}

/** @private function of toolCallUtils */
function parseWalletToolResult(result: unknown): WalletToolResult | null {
    return parseToolResultObject(result) as WalletToolResult | null;
}

/** @private function of toolCallUtils */
function createToolCallMarker(toolCall: ToolCall): string {
    const resultMarker =
        typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result ?? null);
    return `${toolCall.name}|${toolCall.createdAt || ''}|${resultMarker}`;
}

/** @private function of toolCallUtils */
function shouldRequestBrowserUserLocation(toolCall: ToolCall): boolean {
    if (toolCall.name !== USER_LOCATION_TOOL_NAME) {
        return false;
    }

    const parsedResult = parseUserLocationToolResult(toolCall.result);
    return parsedResult?.status === USER_LOCATION_UNAVAILABLE_STATUS;
}

/** @private function of toolCallUtils */
function shouldRequestPrivateModeEnable(toolCall: ToolCall): boolean {
    if (toolCall.name !== TURN_PRIVACY_ON_TOOL_NAME) {
        return false;
    }

    const parsedResult = parsePrivacyToolResult(toolCall.result);
    return parsedResult?.status === PRIVACY_CONFIRMATION_REQUIRED_STATUS;
}

/** @private function of toolCallUtils */
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

/** @private function of toolCallUtils */
function shouldRequestWalletRecord(toolCall: ToolCall): boolean {
    if (toolCall.name !== 'request_wallet_record') {
        return false;
    }

    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_REQUESTED_STATUS;
}

/** @private function of toolCallUtils */
function shouldRequestWalletCredential(toolCall: ToolCall): boolean {
    const parsedResult = parseWalletToolResult(toolCall.result);
    return parsedResult?.status === WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/** @private function of toolCallUtils */
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

/** @private function of toolCallUtils */
function getPseudoUserLabel(toolCall: ToolCall): string {
    const parsedResult = parseTeamToolResult(toolCall.result);
    return parsedResult?.teammate?.label?.trim() || 'User';
}

/** @private function of toolCallUtils */
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

/** @private function of toolCallUtils */
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

/** @private function of toolCallUtils */
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
 * Collection of helpers that interpret tool calls emitted by agents.
 *
 * @private collection for AgentChatWrapper
 */
export const toolCallUtils = {
    buildPendingWalletRequest,
    createToolCallMarker,
    findNewestMatchingToolCall,
    getPseudoUserLabel,
    getPseudoUserPromptText,
    shouldRequestBrowserUserLocation,
    shouldRequestPrivateModeEnable,
    shouldRequestPseudoUserReply,
    shouldRequestWalletCredential,
    shouldRequestWalletRecord,
};
