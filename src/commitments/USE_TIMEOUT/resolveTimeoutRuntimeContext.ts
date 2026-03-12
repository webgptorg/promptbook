import type { TODO_any } from '../../_packages/types.index';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import type { TimeoutToolRuntimeContext } from './TimeoutToolRuntimeAdapter';

/**
 * Resolves timeout runtime context from hidden tool arguments.
 *
 * @private internal utility of USE TIMEOUT
 */
export function resolveTimeoutRuntimeContext(args: Record<string, TODO_any>): TimeoutToolRuntimeContext {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const chatContext = runtimeContext?.chat;

    return {
        enabled: Boolean(chatContext?.chatId),
        chatId: chatContext?.chatId,
        userId: chatContext?.userId,
        agentId: chatContext?.agentId,
        agentName: chatContext?.agentName,
        promptParameters: normalizePromptParameters(chatContext?.parameters),
    };
}

/**
 * Normalizes stored prompt parameters carried by timeout runtime context.
 *
 * @private internal utility of USE TIMEOUT
 */
function normalizePromptParameters(rawParameters: unknown): Record<string, string> {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        return {};
    }

    const normalizedEntries = Object.entries(rawParameters).filter(([, value]) => typeof value === 'string');
    return Object.fromEntries(normalizedEntries) as Record<string, string>;
}
