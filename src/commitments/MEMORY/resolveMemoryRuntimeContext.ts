import type { TODO_any } from '../../_packages/types.index';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import type { MemoryToolRuntimeContext } from './MemoryToolRuntimeAdapter';

/**
 * Resolves runtime context from hidden tool arguments.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function resolveMemoryRuntimeContext(args: Record<string, TODO_any>): MemoryToolRuntimeContext {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const memoryContext = runtimeContext?.memory;

    return {
        enabled: memoryContext?.enabled === true,
        userId: memoryContext?.userId,
        username: memoryContext?.username,
        agentId: memoryContext?.agentId,
        agentName: memoryContext?.agentName,
        isTeamConversation: memoryContext?.isTeamConversation === true,
        isPrivateMode: memoryContext?.isPrivateMode === true,
    };
}
