import { readToolRuntimeContextFromToolArgs } from '../../../../../src/commitments/_common/toolRuntimeContext';
import type { TODO_any } from '../../../../../src/utils/organization/TODO_any';
import type { AgentBrowserProfile } from './$provideAgentBrowserProfile';
import { $provideAgentBrowserProfile } from './$provideAgentBrowserProfile';

/**
 * Provides the persistent browser profile of the agent executing one tool call.
 *
 * The agent identity is read from the hidden tool runtime context embedded in the tool arguments.
 * The function never throws - browser tools keep working on the shared default profile when the
 * agent identity or the profile cannot be resolved.
 *
 * @param args - Raw tool arguments including hidden runtime keys.
 * @returns Agent browser profile or `null` when no agent identity is available.
 */
export async function $provideAgentBrowserProfileForToolArgs(
    args: Record<string, TODO_any>,
): Promise<AgentBrowserProfile | null> {
    try {
        const runtimeContext = readToolRuntimeContextFromToolArgs(args);
        const agentIdentifier = runtimeContext?.chat?.agentId || runtimeContext?.memory?.agentId;
        if (!agentIdentifier) {
            return null;
        }

        const userId = runtimeContext?.chat?.userId ?? runtimeContext?.memory?.userId;

        return await $provideAgentBrowserProfile({
            agentIdentifier,
            userId: typeof userId === 'number' ? userId : undefined,
        });
    } catch (error) {
        console.warn('[agent-browser-profile] Failed to provide agent browser profile for tool call', { error });
        return null;
    }
}
