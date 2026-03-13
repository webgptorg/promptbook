import type {
    CancelTimeoutToolResult,
    SetTimeoutToolResult,
    TimeoutToolAction,
    TimeoutToolResult,
    TimeoutToolRuntimeAdapter,
    TimeoutToolRuntimeContext,
} from './TimeoutToolRuntimeAdapter';
import { getTimeoutToolRuntimeAdapter } from './setTimeoutToolRuntimeAdapter';

/**
 * Builds a disabled timeout-tool payload.
 *
 * @private internal utility of USE TIMEOUT
 */
function createDisabledTimeoutResult(action: TimeoutToolAction, message: string): TimeoutToolResult {
    if (action === 'set') {
        return {
            action,
            status: 'disabled',
            message,
        };
    }

    return {
        action,
        status: 'disabled',
        message,
    };
}

/**
 * Return type of timeout adapter resolution helper.
 *
 * @private type of UseTimeoutCommitmentDefinition
 */
type TimeoutToolRuntimeAdapterResolution = {
    adapter: TimeoutToolRuntimeAdapter | null;
    disabledResult: SetTimeoutToolResult | CancelTimeoutToolResult | null;
};

/**
 * Resolves the runtime adapter for timeout tools or returns disabled payload when unavailable.
 *
 * @private internal utility of USE TIMEOUT
 */
export function getTimeoutToolRuntimeAdapterOrDisabledResult(
    action: TimeoutToolAction,
    runtimeContext: TimeoutToolRuntimeContext,
): TimeoutToolRuntimeAdapterResolution {
    if (!runtimeContext.enabled || !runtimeContext.chatId) {
        return {
            adapter: null,
            disabledResult: createDisabledTimeoutResult(
                action,
                'Timeouts are unavailable because this conversation is not running inside a chat thread.',
            ),
        };
    }

    const adapter = getTimeoutToolRuntimeAdapter();

    if (!adapter) {
        return {
            adapter: null,
            disabledResult: createDisabledTimeoutResult(
                action,
                'Timeout runtime is not available in this environment.',
            ),
        };
    }

    return {
        adapter,
        disabledResult: null,
    };
}
