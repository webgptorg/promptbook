import {
    parseToolRuntimeContext,
    serializeToolRuntimeContext,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
    type ToolRuntimeContext,
} from '../../../../src/commitments/_common/toolRuntimeContext';
import type { ResolvedCurrentUserMemoryIdentity } from './userMemory';

/**
 * Input for composing prompt parameters with memory runtime context.
 */
export type ComposePromptParametersWithMemoryContextOptions = {
    baseParameters: Record<string, unknown>;
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    agentPermanentId?: string;
    agentName: string;
    isPrivateModeEnabled?: boolean;
};

/**
 * Composes prompt parameters while embedding tool runtime context for memory tools.
 */
export function composePromptParametersWithMemoryContext(
    options: ComposePromptParametersWithMemoryContextOptions,
): Record<string, string> {
    const { baseParameters, currentUserIdentity, agentPermanentId, agentName, isPrivateModeEnabled } = options;
    const normalizedBaseParameters = normalizePromptParameters(baseParameters);

    const existingRuntimeContext =
        parseToolRuntimeContext(normalizedBaseParameters[TOOL_RUNTIME_CONTEXT_PARAMETER]) || {};
    const isTeamConversation = existingRuntimeContext.memory?.isTeamConversation === true;
    const isPrivateMode = isPrivateModeEnabled === true;
    const isMemoryEnabled = Boolean(currentUserIdentity && !isTeamConversation && !isPrivateMode);

    const mergedRuntimeContext: ToolRuntimeContext = {
        ...existingRuntimeContext,
        memory: {
            ...(existingRuntimeContext.memory || {}),
            enabled: isMemoryEnabled,
            userId: currentUserIdentity?.userId,
            username: currentUserIdentity?.user.username,
            agentId: agentPermanentId,
            agentName,
            isTeamConversation,
            isPrivateMode,
        },
    };

    return {
        ...normalizedBaseParameters,
        [TOOL_RUNTIME_CONTEXT_PARAMETER]: serializeToolRuntimeContext(mergedRuntimeContext),
    };
}

/**
 * Converts unknown prompt parameter values to string values required by Promptbook templates.
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
