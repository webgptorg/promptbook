import type { TODO_any } from '../../_packages/types.index';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import type { WalletToolRuntimeContext } from './WalletToolRuntimeAdapter';

/**
 * Resolves runtime context from hidden tool arguments.
 *
 * @private function of WalletCommitmentDefinition
 */
export function resolveWalletRuntimeContext(args: Record<string, TODO_any>): WalletToolRuntimeContext {
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
