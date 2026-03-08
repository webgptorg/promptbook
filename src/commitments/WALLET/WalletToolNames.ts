import type { string_javascript_name } from '../../_packages/types.index';

/**
 * Names of tools used by the WALLET commitment.
 *
 * @private constant of WalletCommitmentDefinition
 */
export const WalletToolNames = {
    retrieve: 'retrieve_wallet_records' as string_javascript_name,
    store: 'store_wallet_record' as string_javascript_name,
    update: 'update_wallet_record' as string_javascript_name,
    delete: 'delete_wallet_record' as string_javascript_name,
    request: 'request_wallet_record' as string_javascript_name,
} as const;
