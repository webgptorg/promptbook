import type { TODO_any } from '../../_packages/types.index';
import { readToolRuntimeContextFromToolArgs } from '../_common/toolRuntimeContext';
import type { KnowledgeToolRuntimeContext } from './KnowledgeToolRuntimeAdapter';

/**
 * Resolves runtime context from hidden tool arguments.
 *
 * @private function of KnowledgeCommitmentDefinition
 */
export function resolveKnowledgeRuntimeContext(args: Record<string, TODO_any>): KnowledgeToolRuntimeContext {
    const runtimeContext = readToolRuntimeContextFromToolArgs(args);
    const knowledgeContext = runtimeContext?.knowledge;

    return {
        enabled: knowledgeContext?.enabled === true || Boolean(runtimeContext?.chat?.agentId),
        agentId: knowledgeContext?.agentId || runtimeContext?.chat?.agentId,
        agentName: knowledgeContext?.agentName || runtimeContext?.chat?.agentName,
    };
}
