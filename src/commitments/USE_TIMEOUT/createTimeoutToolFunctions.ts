import type { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { createToolExecutionEnvelope } from '../_common/toolExecutionEnvelope';
import { getTimeoutToolRuntimeAdapterOrDisabledResult } from './getTimeoutToolRuntimeAdapterOrDisabledResult';
import { parseTimeoutToolArgs } from './parseTimeoutToolArgs';
import { TimeoutToolNames } from './TimeoutToolNames';
import type {
    CancelTimeoutToolArgs,
    CancelTimeoutToolResult,
    SetTimeoutToolArgs,
    SetTimeoutToolResult,
} from './TimeoutToolRuntimeAdapter';
import { resolveTimeoutRuntimeContext } from './resolveTimeoutRuntimeContext';

/**
 * Gets `USE TIMEOUT` tool function implementations.
 *
 * @private internal utility of USE TIMEOUT
 */
export function createTimeoutToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [TimeoutToolNames.set](args: SetTimeoutToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('set', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.set(args);
                const scheduledTimeout = await adapter.scheduleTimeout(parsedArgs, runtimeContext);
                const result: SetTimeoutToolResult = {
                    action: 'set',
                    status: 'set',
                    timeoutId: scheduledTimeout.timeoutId,
                    dueAt: scheduledTimeout.dueAt,
                };

                return createToolExecutionEnvelope({
                    assistantMessage: 'The timer was set.',
                    toolResult: result,
                });
            } catch (error) {
                const result: SetTimeoutToolResult = {
                    action: 'set',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
        async [TimeoutToolNames.cancel](args: CancelTimeoutToolArgs): Promise<string> {
            const runtimeContext = resolveTimeoutRuntimeContext(args);
            const { adapter, disabledResult } = getTimeoutToolRuntimeAdapterOrDisabledResult('cancel', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseTimeoutToolArgs.cancel(args);
                const cancelledTimeout = await adapter.cancelTimeout(parsedArgs, runtimeContext);
                const result: CancelTimeoutToolResult = {
                    action: 'cancel',
                    status: cancelledTimeout.status,
                    timeoutId: cancelledTimeout.timeoutId,
                    dueAt: cancelledTimeout.dueAt,
                };

                return createToolExecutionEnvelope({
                    assistantMessage:
                        cancelledTimeout.status === 'cancelled'
                            ? 'The timer was cancelled.'
                            : 'The timer was already inactive.',
                    toolResult: result,
                });
            } catch (error) {
                const result: CancelTimeoutToolResult = {
                    action: 'cancel',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                };

                return JSON.stringify(result);
            }
        },
    };
}
