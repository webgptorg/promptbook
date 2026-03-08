import type {
    WalletDisabledToolResult,
    WalletRuntimeToolAction,
    WalletToolRuntimeAdapter,
    WalletToolRuntimeContext,
} from './WalletToolRuntimeAdapter';
import { getWalletToolRuntimeAdapter } from './setWalletToolRuntimeAdapter';

/**
 * Resolves disabled message for wallet runtime context.
 *
 * @private function of WalletCommitmentDefinition
 */
export function resolveWalletDisabledMessage(runtimeContext: WalletToolRuntimeContext): string | null {
    if (runtimeContext.isPrivateMode) {
        return 'Wallet is disabled because private mode is active.';
    }
    if (runtimeContext.isTeamConversation) {
        return 'Wallet is disabled for TEAM conversations.';
    }
    if (!runtimeContext.enabled) {
        return 'Wallet is disabled for unauthenticated users.';
    }

    return null;
}

/**
 * Resolves runtime adapter for wallet tools or returns disabled payload when unavailable.
 *
 * @private function of WalletCommitmentDefinition
 */
export function getWalletToolRuntimeAdapterOrDisabledResult(
    action: WalletRuntimeToolAction,
    runtimeContext: WalletToolRuntimeContext,
): { adapter: WalletToolRuntimeAdapter | null; disabledResult?: WalletDisabledToolResult } {
    const disabledMessage = resolveWalletDisabledMessage(runtimeContext);
    if (disabledMessage) {
        return {
            adapter: null,
            disabledResult: {
                action,
                status: 'disabled',
                records: action === 'retrieve' ? [] : undefined,
                message: disabledMessage,
            },
        };
    }

    const adapter = getWalletToolRuntimeAdapter();
    if (!adapter) {
        return {
            adapter: null,
            disabledResult: {
                action,
                status: 'disabled',
                records: action === 'retrieve' ? [] : undefined,
                message: 'Wallet runtime is not available in this environment.',
            },
        };
    }

    return { adapter };
}
