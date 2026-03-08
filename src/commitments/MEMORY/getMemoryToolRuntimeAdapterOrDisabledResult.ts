import type {
    DeleteMemoryToolResult,
    MemoryToolAction,
    MemoryToolResult,
    MemoryToolRuntimeAdapter,
    MemoryToolRuntimeContext,
    RetrieveMemoryToolResult,
    StoreMemoryToolResult,
    UpdateMemoryToolResult,
} from './MemoryToolRuntimeAdapter';
import { getMemoryToolRuntimeAdapter } from './setMemoryToolRuntimeAdapter';

/**
 * Builds a disabled memory-tool response payload.
 *
 * @private function of MemoryCommitmentDefinition
 */
function createDisabledMemoryResult(action: MemoryToolAction, message: string): MemoryToolResult {
    if (action === 'retrieve') {
        return {
            action,
            status: 'disabled',
            memories: [],
            message,
        };
    }

    if (action === 'store') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    if (action === 'update') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    if (action === 'delete') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    throw new Error(`Unsupported memory tool action: ${action}`);
}

/**
 * Return type of MEMORY adapter resolution helper.
 *
 * @private type of MemoryCommitmentDefinition
 */
type MemoryToolRuntimeAdapterResolution = {
    adapter: MemoryToolRuntimeAdapter | null;
    disabledResult:
        | RetrieveMemoryToolResult
        | StoreMemoryToolResult
        | UpdateMemoryToolResult
        | DeleteMemoryToolResult
        | null;
};

/**
 * Gets the runtime adapter and returns a disabled result when unavailable.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function getMemoryToolRuntimeAdapterOrDisabledResult(
    action: MemoryToolAction,
    runtimeContext: MemoryToolRuntimeContext,
): MemoryToolRuntimeAdapterResolution {
    if (!runtimeContext.enabled || runtimeContext.isTeamConversation || runtimeContext.isPrivateMode) {
        const message = runtimeContext.isPrivateMode
            ? 'Memory is disabled because private mode is active.'
            : runtimeContext.isTeamConversation
            ? 'Memory is disabled for TEAM conversations.'
            : 'Memory is disabled for unauthenticated users.';

        return {
            adapter: null,
            disabledResult: createDisabledMemoryResult(action, message),
        };
    }

    const memoryToolRuntimeAdapter = getMemoryToolRuntimeAdapter();
    if (!memoryToolRuntimeAdapter) {
        return {
            adapter: null,
            disabledResult: createDisabledMemoryResult(action, 'Memory runtime is not available in this environment.'),
        };
    }

    return {
        adapter: memoryToolRuntimeAdapter,
        disabledResult: null,
    };
}
