import type { ToolCall } from '../../../types/ToolCall';
import { resolveToolCallIdempotencyKey } from '../../../utils/toolCalls/resolveToolCallIdempotencyKey';
import { parseToolCallResult } from './toolCallParsing';

/**
 * Synthetic tool name used for wallet-credential chips in chat UI.
 *
 * @private internal chat-ui marker for credential usage
 */
export const WALLET_CREDENTIAL_TOOL_CALL_NAME = 'wallet_credential_used';

/**
 * Safe, user-facing metadata shown in wallet-credential chips/modal.
 *
 * @private internal chat-ui type for credential usage details
 */
export type WalletCredentialToolCallResult = {
    credentialName: string;
    purpose: string;
    service: string;
    key: string;
    sourceToolName: string;
    sourceToolNames?: Array<string>;
};

/**
 * Structured payload shape returned by wallet-required tool results.
 *
 * @private internal helper type
 */
type WalletCredentialRequiredToolResult = {
    status?: string;
};

/**
 * Tool names covered by USE PROJECT.
 *
 * @private internal constant
 */
const USE_PROJECT_TOOL_NAMES = new Set([
    'project_list_files',
    'project_read_file',
    'project_upsert_file',
    'project_delete_file',
    'project_create_branch',
    'project_create_pull_request',
]);

/**
 * Missing-credential status returned by wallet-aware tools.
 *
 * @private internal constant
 */
const WALLET_CREDENTIAL_REQUIRED_STATUS = 'wallet-credential-required';

/**
 * Prefix used for synthetic idempotency keys produced by message-level credential deduplication.
 *
 * @private internal constant
 */
const WALLET_CREDENTIAL_DEDUPLICATION_IDEMPOTENCY_PREFIX = 'wallet-credential';

/**
 * Parses credential-chip result payload from a tool result.
 *
 * @param result - Raw tool result payload.
 * @returns Parsed credential metadata or `null`.
 * @private internal helper reused by chip and modal rendering
 */
export function parseWalletCredentialToolCallResult(result: unknown): WalletCredentialToolCallResult | null {
    if (!result || typeof result !== 'object') {
        return null;
    }

    const candidate = result as Partial<WalletCredentialToolCallResult>;
    if (
        typeof candidate.credentialName !== 'string' ||
        typeof candidate.purpose !== 'string' ||
        typeof candidate.service !== 'string' ||
        typeof candidate.key !== 'string' ||
        typeof candidate.sourceToolName !== 'string'
    ) {
        return null;
    }

    const sourceToolNames = normalizeSourceToolNames(
        Array.isArray(candidate.sourceToolNames) ? candidate.sourceToolNames : undefined,
        candidate.sourceToolName,
    );

    return {
        credentialName: candidate.credentialName,
        purpose: candidate.purpose,
        service: candidate.service,
        key: candidate.key,
        sourceToolName: candidate.sourceToolName,
        ...(sourceToolNames.length > 0 ? { sourceToolNames } : {}),
    };
}

/**
 * Builds a synthetic credential chip tool call for one completed action.
 *
 * Chip is emitted only when the action actually used wallet credentials.
 *
 * @param toolCall - Original tool call.
 * @returns Synthetic credential chip tool call or `null`.
 * @private internal helper for chat message chip composition
 */
export function createWalletCredentialToolCall(toolCall: ToolCall): ToolCall | null {
    const parsedResult = createWalletCredentialToolCallResult(toolCall);
    if (!parsedResult) {
        return null;
    }

    const baseIdempotencyKey = toolCall.idempotencyKey || resolveToolCallIdempotencyKey(toolCall);

    return createWalletCredentialToolCallFromResult({
        parsedResult,
        sourceToolCall: toolCall,
        idempotencyKey: `${WALLET_CREDENTIAL_TOOL_CALL_NAME}:${baseIdempotencyKey}`,
    });
}

/**
 * Builds deduplicated credential chip tool calls for one assistant message.
 *
 * Tool calls are grouped by stable credential identity (`service` + credential key), so one message shows one chip per
 * credential type/scope while keeping safe details for modal display.
 *
 * @param toolCalls - Completed tool calls in one assistant message.
 * @returns Deduplicated synthetic credential chip tool calls.
 * @private internal helper for chat message chip composition
 */
export function createDeduplicatedWalletCredentialToolCalls(
    toolCalls: ReadonlyArray<ToolCall> | undefined,
): Array<ToolCall> {
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }

    const deduplicatedByCredential = new Map<
        string,
        {
            parsedResult: WalletCredentialToolCallResult;
            sourceToolCall: ToolCall;
        }
    >();

    for (const toolCall of toolCalls) {
        const parsedResult = createWalletCredentialToolCallResult(toolCall);
        if (!parsedResult) {
            continue;
        }

        const deduplicationKey = createWalletCredentialDeduplicationKey(parsedResult);
        const existing = deduplicatedByCredential.get(deduplicationKey);

        if (!existing) {
            deduplicatedByCredential.set(deduplicationKey, {
                parsedResult,
                sourceToolCall: toolCall,
            });
            continue;
        }

        const mergedSourceToolNames = normalizeSourceToolNames(
            [...(existing.parsedResult.sourceToolNames || []), ...(parsedResult.sourceToolNames || [])],
            existing.parsedResult.sourceToolName,
        );

        deduplicatedByCredential.set(deduplicationKey, {
            parsedResult: {
                ...existing.parsedResult,
                sourceToolName: mergedSourceToolNames[0] || existing.parsedResult.sourceToolName,
                ...(mergedSourceToolNames.length > 0 ? { sourceToolNames: mergedSourceToolNames } : {}),
            },
            sourceToolCall: existing.sourceToolCall,
        });
    }

    const deduplicatedToolCalls: Array<ToolCall> = [];
    for (const [deduplicationKey, entry] of deduplicatedByCredential.entries()) {
        deduplicatedToolCalls.push(
            createWalletCredentialToolCallFromResult({
                parsedResult: entry.parsedResult,
                sourceToolCall: entry.sourceToolCall,
                idempotencyKey: `${WALLET_CREDENTIAL_TOOL_CALL_NAME}:${WALLET_CREDENTIAL_DEDUPLICATION_IDEMPOTENCY_PREFIX}:${deduplicationKey}`,
            }),
        );
    }

    return deduplicatedToolCalls;
}

/**
 * Builds structured credential-chip payload for one tool call when credentials were used.
 *
 * @param toolCall - Original tool call.
 * @returns Parsed credential metadata or `null`.
 * @private internal helper reused by credential chip creators
 */
function createWalletCredentialToolCallResult(toolCall: ToolCall): WalletCredentialToolCallResult | null {
    const isUseEmailTool = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const isUseProjectTool = USE_PROJECT_TOOL_NAMES.has(toolCall.name);

    if (!isUseEmailTool && !isUseProjectTool) {
        return null;
    }

    if (isWalletCredentialRequiredResult(toolCall.result)) {
        return null;
    }

    const sourceToolName = toolCall.name;
    return isUseEmailTool
        ? {
              credentialName: 'SMTP credentials used',
              purpose: 'Authenticates the configured mailbox so the agent can send email actions.',
              service: 'smtp',
              key: 'use-email-smtp-credentials',
              sourceToolName,
              sourceToolNames: [sourceToolName],
          }
        : {
              credentialName: 'GitHub credentials used',
              purpose: 'Authenticates access to the configured GitHub repository for project actions.',
              service: 'github',
              key: 'use-project-github-token',
              sourceToolName,
              sourceToolNames: [sourceToolName],
          };
}

/**
 * Creates one synthetic wallet-credential tool call from prepared metadata.
 *
 * @param options - Prepared credential metadata and origin.
 * @returns Synthetic wallet-credential tool call.
 * @private internal helper for credential chip creation
 */
function createWalletCredentialToolCallFromResult(options: {
    parsedResult: WalletCredentialToolCallResult;
    sourceToolCall: ToolCall;
    idempotencyKey: string;
}): ToolCall {
    const { parsedResult, sourceToolCall, idempotencyKey } = options;
    return {
        name: WALLET_CREDENTIAL_TOOL_CALL_NAME,
        arguments: {
            sourceToolName: parsedResult.sourceToolName,
            sourceToolNames: parsedResult.sourceToolNames || [parsedResult.sourceToolName],
        },
        result: parsedResult,
        createdAt: sourceToolCall.createdAt,
        idempotencyKey,
        rawToolCall: {
            kind: WALLET_CREDENTIAL_TOOL_CALL_NAME,
            sourceToolCall: sourceToolCall.rawToolCall || null,
        },
    };
}

/**
 * Builds a stable deduplication key for credential usage inside one message.
 *
 * @param result - Credential metadata to group by.
 * @returns Stable key based on credential service and scope key.
 * @private internal helper
 */
function createWalletCredentialDeduplicationKey(result: Pick<WalletCredentialToolCallResult, 'service' | 'key'>): string {
    return `${normalizeDeduplicationSegment(result.service)}:${normalizeDeduplicationSegment(result.key)}`;
}

/**
 * Normalizes one segment used in deduplication keys.
 *
 * @param value - Raw deduplication key segment.
 * @returns Normalized segment.
 * @private internal helper
 */
function normalizeDeduplicationSegment(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Builds a de-duplicated ordered list of source tool names.
 *
 * @param sourceToolNames - Optional source tool names.
 * @param fallbackSourceToolName - Fallback source tool name.
 * @returns Normalized source tool names list.
 * @private internal helper
 */
function normalizeSourceToolNames(
    sourceToolNames: ReadonlyArray<unknown> | undefined,
    fallbackSourceToolName: string,
): Array<string> {
    const normalizedSourceToolNames = new Set<string>();
    for (const sourceToolName of sourceToolNames || []) {
        if (typeof sourceToolName !== 'string') {
            continue;
        }

        const trimmedSourceToolName = sourceToolName.trim();
        if (!trimmedSourceToolName) {
            continue;
        }

        normalizedSourceToolNames.add(trimmedSourceToolName);
    }

    if (normalizedSourceToolNames.size === 0 && fallbackSourceToolName.trim()) {
        normalizedSourceToolNames.add(fallbackSourceToolName.trim());
    }

    return Array.from(normalizedSourceToolNames.values());
}

/**
 * Detects tool results that report missing credentials.
 *
 * @param result - Raw tool result payload.
 * @returns `true` when credential was not available/used.
 * @private internal helper
 */
function isWalletCredentialRequiredResult(result: unknown): boolean {
    const parsedResult = parseToolCallResult(result) as WalletCredentialRequiredToolResult | null;
    return parsedResult?.status === WALLET_CREDENTIAL_REQUIRED_STATUS;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
