import type { WalletToolRuntimeAdapter } from './WalletToolRuntimeAdapter';

/**
 * Process-wide runtime adapter reference used by wallet tools.
 *
 * @private state of WalletCommitmentDefinition
 */
let walletToolRuntimeAdapter: WalletToolRuntimeAdapter | null = null;

/**
 * Sets runtime adapter used by WALLET tools.
 *
 * @private function of WalletCommitmentDefinition
 */
export function setWalletToolRuntimeAdapter(adapter: WalletToolRuntimeAdapter | null): void {
    walletToolRuntimeAdapter = adapter;
}

/**
 * Gets runtime adapter used by WALLET tools.
 *
 * @private function of WalletCommitmentDefinition
 */
export function getWalletToolRuntimeAdapter(): WalletToolRuntimeAdapter | null {
    return walletToolRuntimeAdapter;
}
