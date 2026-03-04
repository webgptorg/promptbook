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

    return {
        credentialName: candidate.credentialName,
        purpose: candidate.purpose,
        service: candidate.service,
        key: candidate.key,
        sourceToolName: candidate.sourceToolName,
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
    const isUseEmailTool = toolCall.name === 'send_email' || toolCall.name === 'useEmail';
    const isUseProjectTool = USE_PROJECT_TOOL_NAMES.has(toolCall.name);

    if (!isUseEmailTool && !isUseProjectTool) {
        return null;
    }

    if (isWalletCredentialRequiredResult(toolCall.result)) {
        return null;
    }

    const parsedResult: WalletCredentialToolCallResult = isUseEmailTool
        ? {
              credentialName: 'Email SMTP credential',
              purpose: 'Authenticates the configured mailbox so the agent can send email.',
              service: 'smtp',
              key: 'use-email-smtp-credentials',
              sourceToolName: toolCall.name,
          }
        : {
              credentialName: 'GitHub project credential',
              purpose: 'Authenticates access to the configured GitHub repository for project actions.',
              service: 'github',
              key: 'use-project-github-token',
              sourceToolName: toolCall.name,
          };

    const baseIdempotencyKey = toolCall.idempotencyKey || resolveToolCallIdempotencyKey(toolCall);

    return {
        name: WALLET_CREDENTIAL_TOOL_CALL_NAME,
        arguments: {
            sourceToolName: toolCall.name,
        },
        result: parsedResult,
        createdAt: toolCall.createdAt,
        idempotencyKey: `${WALLET_CREDENTIAL_TOOL_CALL_NAME}:${baseIdempotencyKey}`,
        rawToolCall: {
            kind: WALLET_CREDENTIAL_TOOL_CALL_NAME,
            sourceToolCall: toolCall.rawToolCall || null,
        },
    };
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
