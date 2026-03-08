import type { string_javascript_name } from '../../_packages/types.index';
import { WalletToolNames } from './WalletToolNames';

/**
 * Gets human-readable titles for WALLET tool functions.
 *
 * @private function of WalletCommitmentDefinition
 */
export function getWalletToolTitles(): Record<string_javascript_name, string> {
    return {
        [WalletToolNames.retrieve]: 'Wallet',
        [WalletToolNames.store]: 'Store wallet record',
        [WalletToolNames.update]: 'Update wallet record',
        [WalletToolNames.delete]: 'Delete wallet record',
        [WalletToolNames.request]: 'Request wallet record',
    };
}
