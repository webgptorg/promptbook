import { spaceTrim } from 'spacetrim';

/**
 * Gets markdown documentation for WALLET commitment.
 *
 * @private function of WalletCommitmentDefinition
 */
export function getWalletCommitmentDocumentation(type: 'WALLET' | 'WALLETS'): string {
    return spaceTrim(`
        # ${type}

        Enables private credential storage for tokens, usernames/passwords, and session cookies.
    `);
}
