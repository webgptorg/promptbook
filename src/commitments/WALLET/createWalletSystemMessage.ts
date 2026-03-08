import { spaceTrim } from 'spacetrim';
import { WalletToolNames } from './WalletToolNames';

/**
 * Creates WALLET system-message instructions.
 *
 * @private function of WalletCommitmentDefinition
 */
export function createWalletSystemMessage(extraInstructions: string): string {
    return spaceTrim(
        (block) => `
            Wallet:
            - Use "${WalletToolNames.retrieve}" before authenticated operations.
            - Use "${WalletToolNames.store}" and "${WalletToolNames.update}" to maintain credentials.
            - Use "${WalletToolNames.delete}" to remove invalid credentials.
            - Use "${WalletToolNames.request}" to request missing credentials via UI popup.
            - Scope records by user (\`isUserScoped\`) and/or by agent (\`isGlobal=false\`) as needed.
            - Never expose raw credentials in chat responses.
            ${block(extraInstructions)}
        `,
    );
}
