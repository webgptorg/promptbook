import {
    parseToolRuntimeContext,
    TOOL_RUNTIME_CONTEXT_PARAMETER,
    type ToolRuntimeContext,
} from '../../../../../../../../src/commitments/_common/toolRuntimeContext';
import { resolveCurrentUserIdentity, type ResolvedCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { resolveCurrentUserMemoryIdentity, type ResolvedCurrentUserMemoryIdentity } from '@/src/utils/userMemory';

/**
 * Current request identities resolved for one stateless agent chat request.
 */
export type ResolvedAgentChatRequestIdentities = {
    currentUserIdentity: ResolvedCurrentUserMemoryIdentity | null;
    currentRequestIdentity: ResolvedCurrentUserIdentity | null;
    isTeamConversation: boolean;
};

/**
 * Resolves identity state for one stateless chat request.
 *
 * TEAM tool calls are internal agent-to-agent requests. They carry the original
 * tool runtime context and should not create a fresh browser anonymous user.
 *
 * @param rawParameters - Request prompt parameters from the chat API payload.
 * @returns Identity state used by the chat runtime.
 */
export async function resolveAgentChatRequestIdentities(
    rawParameters: Record<string, unknown>,
): Promise<ResolvedAgentChatRequestIdentities> {
    const toolRuntimeContext = resolveAgentChatIncomingToolRuntimeContext(rawParameters);
    const isTeamConversation = toolRuntimeContext?.memory?.isTeamConversation === true;

    if (isTeamConversation) {
        return {
            currentUserIdentity: null,
            currentRequestIdentity: null,
            isTeamConversation,
        };
    }

    const [currentUserIdentity, currentRequestIdentity] = await Promise.all([
        resolveCurrentUserMemoryIdentity(),
        resolveCurrentUserIdentity(),
    ]);

    return {
        currentUserIdentity,
        currentRequestIdentity,
        isTeamConversation,
    };
}

/**
 * Reads the hidden tool runtime context from incoming chat prompt parameters.
 *
 * @param rawParameters - Request prompt parameters from the chat API payload.
 * @returns Parsed tool runtime context, or `null` when absent/invalid.
 */
export function resolveAgentChatIncomingToolRuntimeContext(
    rawParameters: Record<string, unknown>,
): ToolRuntimeContext | null {
    return parseToolRuntimeContext(rawParameters[TOOL_RUNTIME_CONTEXT_PARAMETER]);
}
