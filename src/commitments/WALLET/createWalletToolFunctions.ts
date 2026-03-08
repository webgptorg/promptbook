import type { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { getWalletToolRuntimeAdapterOrDisabledResult, resolveWalletDisabledMessage } from './getWalletToolRuntimeAdapterOrDisabledResult';
import { parseWalletToolArgs } from './parseWalletToolArgs';
import { resolveWalletRuntimeContext } from './resolveWalletRuntimeContext';
import type {
    DeleteWalletRecordToolArgs,
    RequestWalletRecordToolArgs,
    RetrieveWalletRecordsToolArgs,
    StoreWalletRecordToolArgs,
    UpdateWalletRecordToolArgs,
} from './WalletToolRuntimeAdapter';
import { WalletToolNames } from './WalletToolNames';

/**
 * Creates runtime wallet tool function implementations.
 *
 * @private function of WalletCommitmentDefinition
 */
export function createWalletToolFunctions(): Record<string_javascript_name, ToolFunction> {
    return {
        async [WalletToolNames.retrieve](args: RetrieveWalletRecordsToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            const { adapter, disabledResult } = getWalletToolRuntimeAdapterOrDisabledResult('retrieve', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseWalletToolArgs.retrieve(args);
                const records = await adapter.retrieveWalletRecords(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'ok',
                    query: parsedArgs.query,
                    records,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'retrieve',
                    status: 'error',
                    records: [],
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [WalletToolNames.store](args: StoreWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            const { adapter, disabledResult } = getWalletToolRuntimeAdapterOrDisabledResult('store', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseWalletToolArgs.store(args);
                const record = await adapter.storeWalletRecord(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'store',
                    status: 'stored',
                    record,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'store',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [WalletToolNames.update](args: UpdateWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            const { adapter, disabledResult } = getWalletToolRuntimeAdapterOrDisabledResult('update', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseWalletToolArgs.update(args);
                const record = await adapter.updateWalletRecord(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'update',
                    status: 'updated',
                    record,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'update',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [WalletToolNames.delete](args: DeleteWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            const { adapter, disabledResult } = getWalletToolRuntimeAdapterOrDisabledResult('delete', runtimeContext);

            if (!adapter || disabledResult) {
                return JSON.stringify(disabledResult);
            }

            try {
                const parsedArgs = parseWalletToolArgs.delete(args);
                const deleted = await adapter.deleteWalletRecord(parsedArgs, runtimeContext);
                return JSON.stringify({
                    action: 'delete',
                    status: 'deleted',
                    walletId: deleted.id,
                });
            } catch (error) {
                return JSON.stringify({
                    action: 'delete',
                    status: 'error',
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        },
        async [WalletToolNames.request](args: RequestWalletRecordToolArgs): Promise<string> {
            const runtimeContext = resolveWalletRuntimeContext(args);
            const disabledMessage = resolveWalletDisabledMessage(runtimeContext);
            if (disabledMessage) {
                return JSON.stringify({
                    action: 'request',
                    status: 'disabled',
                    message: disabledMessage,
                });
            }

            const request = parseWalletToolArgs.request(args);
            return JSON.stringify({
                action: 'request',
                status: 'requested',
                request,
                message:
                    request.message ||
                    `Request user to provide ${request.recordType} credentials for service "${request.service}".`,
            });
        },
    };
}
