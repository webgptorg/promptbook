import type { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { getMemoryToolRuntimeAdapterOrDisabledResult } from './getMemoryToolRuntimeAdapterOrDisabledResult';
import { MemoryToolNames } from './MemoryToolNames';
import { parseMemoryToolArgs } from './parseMemoryToolArgs';
import type {
    DeleteMemoryToolArgs,
    DeleteMemoryToolResult,
    RetrieveMemoryToolArgs,
    RetrieveMemoryToolResult,
    StoreMemoryToolArgs,
    StoreMemoryToolResult,
    UpdateMemoryToolArgs,
    UpdateMemoryToolResult,
} from './MemoryToolRuntimeAdapter';
import { resolveMemoryRuntimeContext } from './resolveMemoryRuntimeContext';

/**
 * Gets MEMORY tool function implementations.
 *
 * @private function of MemoryCommitmentDefinition
 */
export function createMemoryToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [MemoryToolNames.retrieve](args: RetrieveMemoryToolArgs): Promise<string> {
            const runtimeContext = resolveMemoryRuntimeContext(args);
            const { adapter, disabledResult } = getMemoryToolRuntimeAdapterOrDisabledResult('retrieve', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            const parsedArgs = parseMemoryToolArgs.retrieve(args);

            try {
                const memories = await adapter.retrieveMemories(parsedArgs, runtimeContext);
                const result: RetrieveMemoryToolResult = {
                    action: 'retrieve',
                    status: 'ok',
                    query: parsedArgs.query,
                    memories,
                };
                return JSON.stringify(result);
            } catch (error) {
                const result: RetrieveMemoryToolResult = {
                    action: 'retrieve',
                    status: 'error',
                    query: parsedArgs.query,
                    memories: [],
                    message: error instanceof Error ? error.message : String(error),
                };
                return JSON.stringify(result);
            }
        },
        async [MemoryToolNames.store](args: StoreMemoryToolArgs): Promise<string> {
            const runtimeContext = resolveMemoryRuntimeContext(args);
            const { adapter, disabledResult } = getMemoryToolRuntimeAdapterOrDisabledResult('store', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseMemoryToolArgs.store(args);
                const memory = await adapter.storeMemory(parsedArgs, runtimeContext);
                const result: StoreMemoryToolResult = {
                    action: 'store',
                    status: 'stored',
                    memory,
                };
                return JSON.stringify(result);
            } catch (error) {
                const result: StoreMemoryToolResult = {
                    action: 'store',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };
                return JSON.stringify(result);
            }
        },
        async [MemoryToolNames.update](args: UpdateMemoryToolArgs): Promise<string> {
            const runtimeContext = resolveMemoryRuntimeContext(args);
            const { adapter, disabledResult } = getMemoryToolRuntimeAdapterOrDisabledResult('update', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseMemoryToolArgs.update(args);
                const memory = await adapter.updateMemory(parsedArgs, runtimeContext);
                const result: UpdateMemoryToolResult = {
                    action: 'update',
                    status: 'updated',
                    memory,
                };
                return JSON.stringify(result);
            } catch (error) {
                const result: UpdateMemoryToolResult = {
                    action: 'update',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };
                return JSON.stringify(result);
            }
        },
        async [MemoryToolNames.delete](args: DeleteMemoryToolArgs): Promise<string> {
            const runtimeContext = resolveMemoryRuntimeContext(args);
            const { adapter, disabledResult } = getMemoryToolRuntimeAdapterOrDisabledResult('delete', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseMemoryToolArgs.delete(args);
                const deleted = await adapter.deleteMemory(parsedArgs, runtimeContext);
                const result: DeleteMemoryToolResult = {
                    action: 'delete',
                    status: 'deleted',
                    memoryId: deleted.id,
                };
                return JSON.stringify(result);
            } catch (error) {
                const result: DeleteMemoryToolResult = {
                    action: 'delete',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };
                return JSON.stringify(result);
            }
        },
    };
}
